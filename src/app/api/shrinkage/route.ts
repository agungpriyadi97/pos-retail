import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ShrinkageReason, ShrinkageStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status') as ShrinkageStatus | null;

    const whereClause: any = {};
    if (branchId) whereClause.branchId = branchId;
    if (status) whereClause.status = status;

    const logs = await prisma.shrinkageLog.findMany({
      where: whereClause,
      include: {
        branch: true,
        product: true,
        submittedBy: {
          select: { id: true, fullName: true, username: true },
        },
        approvedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error: any) {
    console.error('Fetch Shrinkage Logs Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch shrinkage logs.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      branchId,
      productId,
      quantity,
      unitCost,
      reason,
      notes,
      batchNumber,
      expiredDate,
      submittedById,
    } = body;

    if (!branchId || !productId || !quantity || !unitCost || !reason) {
      return NextResponse.json(
        { error: 'Missing required shrinkage fields.' },
        { status: 400 }
      );
    }

    // Validate submittedById with safe fallback to active user
    let validSubmitterId = submittedById;
    if (submittedById) {
      const submitter = await prisma.user.findUnique({
        where: { id: submittedById },
      });
      if (!submitter) validSubmitterId = null;
    }

    if (!validSubmitterId) {
      const fallbackUser = await prisma.user.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'asc' },
      });
      if (!fallbackUser) {
        throw new Error('No active user found in database to record submission.');
      }
      validSubmitterId = fallbackUser.id;
    }

    const qtyNum = Number(quantity);
    const costNum = Number(unitCost);
    const totalLossNum = qtyNum * costNum;

    const log = await prisma.shrinkageLog.create({
      data: {
        branchId,
        productId,
        quantity: qtyNum,
        unitCost: costNum,
        totalLoss: totalLossNum,
        reason: reason as ShrinkageReason,
        status: ShrinkageStatus.PENDING,
        notes: notes || '',
        batchNumber: batchNumber || null,
        expiredDate: expiredDate ? new Date(expiredDate) : null,
        submittedById: validSubmitterId,
      },
      include: {
        branch: true,
        product: true,
        submittedBy: {
          select: { id: true, fullName: true, username: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: log });
  } catch (error: any) {
    console.error('Create Shrinkage Log Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to record shrinkage log.' },
      { status: 400 }
    );
  }
}

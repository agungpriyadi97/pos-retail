import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ShrinkageStatus, StockMutationType } from '@prisma/client';
import { cookies } from 'next/headers';
import { decodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shrinkageId = params.id;
    const body = await req.json();
    const { approvedById: bodyApprovedById, action } = body; // action: 'APPROVE' | 'REJECT'

    if (!action || !['APPROVE', 'REJECT'].includes(action)) {
      return NextResponse.json(
        { success: false, message: 'Tindakan persetujuan tidak valid.' },
        { status: 400 }
      );
    }

    // 1. Fetch shrinkage log RECORD FIRST outside heavy locks
    const log = await prisma.shrinkageLog.findUnique({
      where: { id: shrinkageId },
    });

    if (!log) {
      return NextResponse.json(
        { success: false, message: 'Catatan pengurang stok tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (log.status !== ShrinkageStatus.PENDING) {
      return NextResponse.json(
        {
          success: false,
          message: `Laporan sudah di-${log.status.toLowerCase()} sebelumnya.`,
        },
        { status: 400 }
      );
    }

    // 2. Identify active session user or fallback to body approvedById
    let activeUserId = bodyApprovedById;
    const cookieStore = cookies();
    const token =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get('session_user')?.value;

    if (token) {
      const decoded = decodeSessionToken(token);
      if (decoded?.id) activeUserId = decoded.id;
      else {
        try {
          const parsed = JSON.parse(token);
          if (parsed?.id) activeUserId = parsed.id;
        } catch (e) {}
      }
    }

    if (!activeUserId) {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Sesi pengguna tidak ditemukan.' },
        { status: 401 }
      );
    }

    // 3. Verify executor role BEFORE transaction -> Return 403 immediately if not ADMIN_OWNER
    const approvingUser = await prisma.user.findUnique({
      where: { id: activeUserId },
    });

    if (!approvingUser || approvingUser.role !== 'ADMIN_OWNER') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Akses ditolak: Hanya Owner/Admin yang memiliki wewenang menyetujui penghapusan stok.',
        },
        { status: 403 }
      );
    }

    // Handle REJECTION cleanly
    if (action === 'REJECT') {
      const rejectedLog = await prisma.shrinkageLog.update({
        where: { id: shrinkageId },
        data: {
          status: ShrinkageStatus.REJECTED,
          approvedById: approvingUser.id,
          resolvedAt: new Date(),
        },
        include: {
          branch: true,
          product: true,
          submittedBy: true,
          approvedBy: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Laporan shrinkage berhasil ditolak.',
        data: rejectedLog,
      });
    }

    // 4. Streamlined transaction with explicit timeout options
    const result = await prisma.$transaction(
      async (tx) => {
        const branchStock = await tx.branchStock.findUnique({
          where: {
            branchId_productId: {
              branchId: log.branchId,
              productId: log.productId,
            },
          },
        });

        const currentQty = branchStock ? branchStock.quantity : 0;
        const newQty = Math.max(0, currentQty - log.quantity);

        // Decrement stock
        await tx.branchStock.upsert({
          where: {
            branchId_productId: {
              branchId: log.branchId,
              productId: log.productId,
            },
          },
          update: {
            quantity: newQty,
          },
          create: {
            branchId: log.branchId,
            productId: log.productId,
            quantity: 0,
          },
        });

        // Write immutable StockLedger entry
        await tx.stockLedger.create({
          data: {
            branchId: log.branchId,
            productId: log.productId,
            mutationType: StockMutationType.SHRINKAGE,
            quantityChange: -log.quantity,
            balanceAfter: newQty,
            referenceId: log.id,
            description: `Shrinkage ${log.reason}: ${log.notes || 'No details'}`,
          },
        });

        // Update ShrinkageLog status to APPROVED
        const updated = await tx.shrinkageLog.update({
          where: { id: shrinkageId },
          data: {
            status: ShrinkageStatus.APPROVED,
            approvedById: approvingUser.id,
            resolvedAt: new Date(),
          },
          include: {
            branch: true,
            product: true,
            submittedBy: true,
            approvedBy: true,
          },
        });

        return updated;
      },
      {
        timeout: 10000,
        maxWait: 5000,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Laporan berhasil disetujui.',
      data: result,
    });
  } catch (error: any) {
    console.error('Approve Shrinkage Error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal memproses persetujuan shrinkage.',
      },
      { status: 500 }
    );
  }
}

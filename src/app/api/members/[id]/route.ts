import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const member = await prisma.member.findUnique({
      where: { id },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            branch: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!member) {
      return NextResponse.json(
        { success: false, message: 'Member tidak ditemukan.' },
        { status: 404 }
      );
    }

    const formatted = {
      id: member.id,
      phone: member.phone,
      fullName: member.fullName,
      points: member.points,
      totalSpend: Number(member.totalSpend),
      createdAt: member.createdAt,
      transactions: member.transactions.map((tx: any) => ({
        id: tx.id,
        invoiceNo: tx.invoiceNo,
        branchName: tx.branch?.name || '-',
        finalAmount: Number(tx.finalAmount),
        pointsEarned: tx.pointsEarned,
        pointsUsed: tx.pointsUsed,
        createdAt: tx.createdAt,
      })),
    };

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch Member Detail Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil detail member.' },
      { status: 500 }
    );
  }
}

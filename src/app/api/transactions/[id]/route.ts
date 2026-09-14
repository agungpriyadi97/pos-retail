import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID Transaksi wajib diisi.' },
        { status: 400 }
      );
    }

    const tx = await prisma.transaction.findUnique({
      where: { id },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
          },
        },
        cashier: {
          select: {
            id: true,
            fullName: true,
            username: true,
          },
        },
        member: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            points: true,
          },
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                barcode: true,
                sku: true,
                unit: true,
              },
            },
          },
        },
      },
    });

    if (!tx) {
      return NextResponse.json(
        { success: false, error: 'Transaksi tidak ditemukan' },
        { status: 404 }
      );
    }

    const formattedCashier = tx.cashier
      ? {
          id: tx.cashier.id,
          name: tx.cashier.fullName,
          fullName: tx.cashier.fullName,
          username: tx.cashier.username,
        }
      : { id: '', name: 'Kasir', fullName: 'Kasir', username: 'kasir' };

    const formattedMember = tx.member
      ? {
          id: tx.member.id,
          name: tx.member.fullName,
          fullName: tx.member.fullName,
          phone: tx.member.phone,
          points: tx.member.points,
        }
      : null;

    const formattedItems = tx.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      costPrice: Number(item.costPrice),
      sellingPrice: Number(item.sellingPrice),
      subtotal: Number(item.subtotal),
      product: item.product,
    }));

    const formattedTransaction = {
      id: tx.id,
      invoiceNo: tx.invoiceNo,
      branchId: tx.branchId,
      cashierId: tx.cashierId,
      memberId: tx.memberId,
      subtotal: Number(tx.subtotal),
      discountAmount: Number(tx.discountAmount),
      pointsUsed: tx.pointsUsed,
      pointDiscount: Number(tx.pointDiscount),
      totalDiscount: Number(tx.discountAmount) + Number(tx.pointDiscount),
      finalAmount: Number(tx.finalAmount),
      paidAmount: Number(tx.paidAmount),
      changeAmount: Number(tx.changeAmount),
      paymentMethod: tx.paymentMethod,
      pointsEarned: tx.pointsEarned,
      createdAt: tx.createdAt.toISOString(),
      branch: tx.branch,
      cashier: formattedCashier,
      user: formattedCashier,
      member: formattedMember,
      items: formattedItems,
    };

    return NextResponse.json({
      success: true,
      transaction: formattedTransaction,
    });
  } catch (error: any) {
    console.error('Error fetching transaction detail:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil detail transaksi.',
      },
      { status: 500 }
    );
  }
}

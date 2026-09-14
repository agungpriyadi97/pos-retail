import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'day';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');
    const paymentMethod = searchParams.get('paymentMethod');

    const now = new Date();
    let start: Date;
    let end: Date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    switch (period) {
      case 'week': {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        start = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
        break;
      }
      case 'month':
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'year':
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        if (startDateParam) {
          const [y, m, d] = startDateParam.split('-').map(Number);
          start = new Date(y, m - 1, d, 0, 0, 0, 0);
        } else {
          start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        }
        if (endDateParam) {
          const [y, m, d] = endDateParam.split('-').map(Number);
          end = new Date(y, m - 1, d, 23, 59, 59, 999);
        }
        break;
      case 'day':
      default:
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        break;
    }

    const whereClause: any = {
      createdAt: {
        gte: start,
        lte: end,
      },
    };

    if (branchId && branchId !== 'ALL' && branchId !== '') {
      whereClause.branchId = branchId;
    }

    if (paymentMethod && paymentMethod !== 'ALL' && paymentMethod !== '') {
      if (Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
        whereClause.paymentMethod = paymentMethod as PaymentMethod;
      }
    }

    const rawTransactions = await prisma.transaction.findMany({
      where: whereClause,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    let totalRevenue = 0;
    let totalDiscount = 0;
    const totalTransactions = rawTransactions.length;

    const formattedTransactions = rawTransactions.map((tx) => {
      const finalAmountNum = Number(tx.finalAmount);
      const discountAmountNum = Number(tx.discountAmount);
      const pointDiscountNum = Number(tx.pointDiscount);
      const totalDisc = discountAmountNum + pointDiscountNum;

      totalRevenue += finalAmountNum;
      totalDiscount += totalDisc;

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

      return {
        id: tx.id,
        invoiceNo: tx.invoiceNo,
        branchId: tx.branchId,
        cashierId: tx.cashierId,
        memberId: tx.memberId,
        subtotal: Number(tx.subtotal),
        discountAmount: discountAmountNum,
        pointsUsed: tx.pointsUsed,
        pointDiscount: pointDiscountNum,
        totalDiscount: totalDisc,
        finalAmount: finalAmountNum,
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
    });

    const averageBasketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        totalDiscount,
        totalTransactions,
        averageBasketSize,
      },
      transactions: formattedTransactions,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Gagal mengambil data transaksi.',
      },
      { status: 500 }
    );
  }
}

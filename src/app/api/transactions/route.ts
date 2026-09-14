import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PaymentMethod } from '@prisma/client';
import { cookies } from 'next/headers';
import { decodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period') || 'day';
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');
    const branchId = searchParams.get('branchId');
    const paymentMethod = searchParams.get('paymentMethod');
    const cashierIdParam = searchParams.get('cashierId');

    // 1. Authenticate Session & Extract Role
    const cookieStore = cookies();
    const token =
      cookieStore.get(SESSION_COOKIE_NAME)?.value ||
      cookieStore.get('session_user')?.value;

    let sessionUser: any = null;
    if (token) {
      sessionUser = decodeSessionToken(token);
      if (!sessionUser) {
        try {
          sessionUser = JSON.parse(token);
        } catch (e) {}
      }
    }

    if (sessionUser?.id) {
      const dbUser = await prisma.user.findUnique({
        where: { id: sessionUser.id },
      });
      if (dbUser) sessionUser = dbUser;
    }

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

    // 2. Apply Branch Filter
    if (branchId && branchId !== 'ALL' && branchId !== '') {
      whereClause.branchId = branchId;
    }

    // 3. Apply Payment Method Filter
    if (paymentMethod && paymentMethod !== 'ALL' && paymentMethod !== '') {
      if (Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
        whereClause.paymentMethod = paymentMethod as PaymentMethod;
      }
    }

    // 4. Apply RBAC Scoping on Cashier/User
    const isOwner = sessionUser?.role === 'ADMIN_OWNER' || sessionUser?.role === 'OWNER';

    if (isOwner) {
      // Owner sees ALL transactions across all users. If a specific cashierId filter parameter is passed, filter by it.
      if (cashierIdParam && cashierIdParam !== 'ALL' && cashierIdParam !== '') {
        whereClause.cashierId = cashierIdParam;
      }
    } else {
      // Cashier role: restrict to session user's transactions only
      if (sessionUser?.id) {
        whereClause.cashierId = sessionUser.id;
      }
    }

    // 5. Fetch Transactions with full relations
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
            role: true,
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
                costPrice: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 6. Fetch Cashiers List (For Owner Filter Dropdown)
    let cashiersList: any[] = [];
    if (isOwner) {
      cashiersList = await prisma.user.findMany({
        select: {
          id: true,
          fullName: true,
          username: true,
          role: true,
        },
        orderBy: {
          fullName: 'asc',
        },
      });
    }

    let totalRevenue = 0;
    let totalDiscount = 0;
    let totalCogs = 0;
    const totalTransactions = rawTransactions.length;

    const formattedTransactions = rawTransactions.map((tx) => {
      const finalAmountNum = Number(tx.finalAmount);
      const discountAmountNum = Number(tx.discountAmount);
      const pointDiscountNum = Number(tx.pointDiscount);
      const totalDisc = discountAmountNum + pointDiscountNum;

      let txCogs = 0;

      const formattedItems = tx.items.map((item) => {
        const itemCostPrice = Number(item.costPrice || item.product?.costPrice || 0);
        const itemSellingPrice = Number(item.sellingPrice || 0);
        const itemSubtotal = Number(item.subtotal || 0);
        const itemTotalCogs = itemCostPrice * item.quantity;

        txCogs += itemTotalCogs;

        return {
          id: item.id,
          quantity: item.quantity,
          costPrice: itemCostPrice,
          sellingPrice: itemSellingPrice,
          subtotal: itemSubtotal,
          totalCogs: itemTotalCogs,
          netProfit: itemSubtotal - itemTotalCogs,
          product: item.product,
        };
      });

      const txNetProfit = finalAmountNum - txCogs;
      const txProfitMargin = finalAmountNum > 0 ? (txNetProfit / finalAmountNum) * 100 : 0;

      totalRevenue += finalAmountNum;
      totalDiscount += totalDisc;
      totalCogs += txCogs;

      const formattedCashier = tx.cashier
        ? {
            id: tx.cashier.id,
            name: tx.cashier.fullName,
            fullName: tx.cashier.fullName,
            username: tx.cashier.username,
            role: tx.cashier.role,
          }
        : { id: '', name: 'Kasir', fullName: 'Kasir', username: 'kasir', role: 'CASHIER' };

      const formattedMember = tx.member
        ? {
            id: tx.member.id,
            name: tx.member.fullName,
            fullName: tx.member.fullName,
            phone: tx.member.phone,
            points: tx.member.points,
          }
        : null;

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
        totalCogs: txCogs,
        netProfit: txNetProfit,
        profitMargin: Number(txProfitMargin.toFixed(2)),
        createdAt: tx.createdAt.toISOString(),
        branch: tx.branch,
        cashier: formattedCashier,
        user: formattedCashier,
        member: formattedMember,
        items: formattedItems,
      };
    });

    const netProfit = totalRevenue - totalCogs;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const averageBasketSize = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        totalDiscount,
        totalTransactions,
        averageBasketSize,
        totalCogs,
        netProfit,
        profitMargin: Number(profitMargin.toFixed(2)),
      },
      transactions: formattedTransactions,
      cashiers: cashiersList,
      userRole: sessionUser?.role || 'CASHIER',
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

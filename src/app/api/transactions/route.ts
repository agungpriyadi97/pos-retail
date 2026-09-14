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
    const cashierId = searchParams.get('cashierId');
    const paymentMethod = searchParams.get('paymentMethod');

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

    // 2. Calculate Date Range (Asia/Jakarta & UTC boundary safe)
    const now = new Date();
    let startDate = new Date();
    let endDate = new Date();

    if (period === 'day') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'week') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (period === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === 'custom') {
      if (startDateParam) {
        const [y, m, d] = startDateParam.split('-').map(Number);
        startDate = new Date(y, m - 1, d, 0, 0, 0, 0);
      } else {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      }
      if (endDateParam) {
        const [y, m, d] = endDateParam.split('-').map(Number);
        endDate = new Date(y, m - 1, d, 23, 59, 59, 999);
      } else {
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }
    }

    // 3. Construct Prisma whereClause
    const whereClause: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    // Branch filter: apply only if not empty and not 'ALL' / 'all'
    if (
      branchId &&
      branchId.toLowerCase() !== 'all' &&
      branchId !== 'undefined' &&
      branchId !== ''
    ) {
      whereClause.branchId = branchId;
    }

    // Payment Method filter: apply only if valid enum value
    if (
      paymentMethod &&
      paymentMethod.toLowerCase() !== 'all' &&
      paymentMethod !== 'Semua Pembayaran' &&
      paymentMethod !== 'undefined' &&
      paymentMethod !== ''
    ) {
      if (Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)) {
        whereClause.paymentMethod = paymentMethod as PaymentMethod;
      }
    }

    // Cashier filter & RBAC scoping
    const isOwner =
      !sessionUser ||
      sessionUser.role === 'ADMIN_OWNER' ||
      sessionUser.role === 'OWNER';

    if (isOwner) {
      // Owner sees ALL cashiers' transactions by default.
      // If a specific cashierId query param is passed and valid, filter by it.
      if (
        cashierId &&
        cashierId.toLowerCase() !== 'all' &&
        cashierId !== 'undefined' &&
        cashierId !== ''
      ) {
        whereClause.cashierId = cashierId;
      }
    } else {
      // Cashier role: restrict to session user's transactions only
      whereClause.cashierId = sessionUser.id;
    }

    // 4. Query Database
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

    // 5. Fetch Cashiers List (for Owner Filter Dropdown)
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

    // 6. Calculate Financial Aggregates
    let totalRevenue = 0;
    let totalCogs = 0;
    let totalDiscount = 0;
    const totalTransactions = rawTransactions.length;

    const formattedTransactions = rawTransactions.map((tx) => {
      const finalAmountNum = Number(tx.finalAmount);
      const discountAmountNum = Number(tx.discountAmount);
      const pointDiscountNum = Number(tx.pointDiscount);
      const totalDisc = discountAmountNum + pointDiscountNum;

      let txCogs = 0;

      const formattedItems = tx.items.map((item) => {
        const itemCostPrice = Number(item.costPrice ?? item.product?.costPrice ?? 0);
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
        ...tx,
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
        txCost: txCogs,
        netProfit: txNetProfit,
        txProfit: txNetProfit,
        profitMargin: Number(txProfitMargin.toFixed(2)),
        profitPercentage: Number(txProfitMargin.toFixed(2)),
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
    const averageBasketSize = totalTransactions > 0 ? Math.round(totalRevenue / totalTransactions) : 0;

    return NextResponse.json({
      success: true,
      summary: {
        totalRevenue,
        totalCost: totalCogs,
        totalCogs,
        netProfit,
        profitMargin: Number(profitMargin.toFixed(2)),
        totalTransactions,
        totalDiscount,
        averageBasketSize,
      },
      transactions: formattedTransactions,
      cashiers: cashiersList,
      userRole: sessionUser?.role || 'ADMIN_OWNER',
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Gagal mengambil riwayat transaksi',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

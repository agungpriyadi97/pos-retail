import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      branchId,
      cashierId,
      memberId,
      items,
      paidAmount,
      paymentMethod = 'CASH',
      pointsUsed = 0,
    } = body;

    if (!branchId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required checkout parameters or empty cart.' },
        { status: 400 }
      );
    }

    // Verify branch exists and is active
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
    });

    if (!branch || (branch as any).isActive === false) {
      return NextResponse.json(
        { error: 'Cabang ini sedang nonaktif dan tidak dapat memproses transaksi kasir.' },
        { status: 400 }
      );
    }

    // Atomic transaction for inventory, member points, transaction logs, & ledger
    const result = await prisma.$transaction(async (tx: any) => {
      // 0. Validate Cashier ID with safe DB fallback to guarantee no FK violation
      let validCashierUser = null;
      if (cashierId) {
        validCashierUser = await tx.user.findUnique({
          where: { id: cashierId },
        });
      }

      if (!validCashierUser) {
        validCashierUser = await tx.user.findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        });
      }

      if (!validCashierUser) {
        throw new Error('No active cashier user account found in database.');
      }

      const validCashierId = validCashierUser.id;

      // 1. Fetch products & verify stock in branch
      const productIds = items.map((i: { productId: string }) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: productIds } },
      });

      const branchStocks = await tx.branchStock.findMany({
        where: {
          branchId,
          productId: { in: productIds },
        },
      });

      const stockMap = new Map<string, any>(branchStocks.map((s: any) => [s.productId, s]));
      const productMap = new Map<string, any>(products.map((p: any) => [p.id, p]));

      let subtotalNum = 0;
      const verifiedItems: any[] = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        if (!product) {
          throw new Error(`Product ID ${item.productId} not found.`);
        }

        const stock = stockMap.get(item.productId);
        const currentQty = stock ? stock.quantity : 0;
        if (currentQty < item.quantity) {
          throw new Error(
            `Insufficient stock for "${product.name}". Available: ${currentQty}, Requested: ${item.quantity}`
          );
        }

        const sellingPriceNum = Number(product.sellingPrice || 0);
        const costPriceNum = Number(product.costPrice || 0);
        const itemSubtotal = sellingPriceNum * item.quantity;
        subtotalNum += itemSubtotal;

        verifiedItems.push({
          productId: product.id,
          productName: product.name,
          quantity: item.quantity,
          costPrice: costPriceNum,
          sellingPrice: sellingPriceNum,
          subtotal: itemSubtotal,
          currentQty,
        });
      }

      // Fetch Store Settings dynamically for loyalty conversion rates
      const storeSetting = await tx.storeSetting.findUnique({
        where: { id: 'default_setting' },
      });

      const pointRedeemValue = storeSetting ? Number(storeSetting.pointRedeemValue) : 100;
      const pointsEarnThreshold = storeSetting ? Number(storeSetting.pointsEarnThreshold) : 10000;
      const isLoyaltyActive = storeSetting ? storeSetting.isLoyaltyActive : true;

      // 2. Process Member & Point calculations using dynamic Store Settings
      let member = null;
      let pointDiscountNum = 0;
      let actualPointsUsed = 0;

      if (memberId && isLoyaltyActive) {
        member = await tx.member.findUnique({
          where: { id: memberId },
        });

        if (!member) {
          throw new Error('Member not found.');
        }

        if (pointsUsed > 0) {
          if (member.points < pointsUsed) {
            throw new Error(`Member only has ${member.points} points available.`);
          }
          actualPointsUsed = pointsUsed;
          pointDiscountNum = actualPointsUsed * pointRedeemValue;
          if (pointDiscountNum > subtotalNum) {
            pointDiscountNum = subtotalNum;
            actualPointsUsed = Math.ceil(subtotalNum / pointRedeemValue);
          }
        }
      }

      const finalAmountNum = subtotalNum - pointDiscountNum;
      const paidAmountNum = Number(paidAmount);

      if (paidAmountNum < finalAmountNum) {
        throw new Error(
          `Paid amount (Rp ${paidAmountNum.toLocaleString()}) is less than final bill amount (Rp ${finalAmountNum.toLocaleString()}).`
        );
      }

      const changeAmountNum = paidAmountNum - finalAmountNum;

      // Earn 1 point for every pointsEarnThreshold spent on net final amount (if loyalty active)
      const pointsEarned = (isLoyaltyActive && memberId && pointsEarnThreshold > 0) 
        ? Math.floor(finalAmountNum / pointsEarnThreshold) 
        : 0;

      // Generate invoice number: INV-YYYYMMDD-XXXX
      const todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const invoiceNo = `INV-${todayStr}-${randomSuffix}`;

      // 3. Create Transaction record with verified cashierId
      const transaction = await tx.transaction.create({
        data: {
          invoiceNo,
          branchId,
          cashierId: validCashierId,
          memberId: memberId || null,
          subtotal: subtotalNum,
          discountAmount: 0,
          pointsUsed: actualPointsUsed,
          pointDiscount: pointDiscountNum,
          finalAmount: finalAmountNum,
          paidAmount: paidAmountNum,
          changeAmount: changeAmountNum,
          paymentMethod: paymentMethod as any,
          pointsEarned,
          items: {
            create: verifiedItems.map((vi: any) => ({
              productId: vi.productId,
              quantity: vi.quantity,
              costPrice: vi.costPrice,
              sellingPrice: vi.sellingPrice,
              subtotal: vi.subtotal,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          branch: true,
          cashier: {
            select: { id: true, fullName: true, username: true },
          },
          member: true,
        },
      });

      // 4. Update Member points & spend
      let updatedMember = null;
      if (memberId && member) {
        if (actualPointsUsed > 0 && member.points < actualPointsUsed) {
          throw new Error(
            `Saldo poin member tidak mencukupi (Tersedia: ${member.points}, Digunakan: ${actualPointsUsed})`
          );
        }

        const netPoints = member.points - actualPointsUsed + pointsEarned;

        updatedMember = await tx.member.update({
          where: { id: memberId },
          data: {
            points: netPoints,
            totalSpend: {
              increment: finalAmountNum,
            },
          },
        });
      }

      if (updatedMember) {
        (transaction as any).member = {
          id: updatedMember.id,
          fullName: updatedMember.fullName,
          phone: updatedMember.phone,
          points: updatedMember.points,
          totalSpend: Number(updatedMember.totalSpend),
        };
      }

      // 5. Decrement inventory stock & create Stock Ledger audit trails
      for (const vi of verifiedItems) {
        const newBalance = vi.currentQty - vi.quantity;

        await tx.branchStock.update({
          where: {
            branchId_productId: {
              branchId,
              productId: vi.productId,
            },
          },
          data: {
            quantity: newBalance,
          },
        });

        await tx.stockLedger.create({
          data: {
            branchId,
            productId: vi.productId,
            mutationType: 'SALE' as any,
            quantityChange: -vi.quantity,
            balanceAfter: newBalance,
            referenceId: transaction.id,
            description: `Checkout transaction ${invoiceNo}`,
          },
        });
      }

      return transaction;
    }, {
      maxWait: 10000,
      timeout: 25000,
    });

    return NextResponse.json({ success: true, transaction: result });
  } catch (error: any) {
    console.error('Checkout API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to complete transaction.' },
      { status: 400 }
    );
  }
}

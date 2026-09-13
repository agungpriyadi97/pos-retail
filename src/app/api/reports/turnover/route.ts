import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    // Calculate start date (7 days ago)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Fetch products with category and branch stock
    const products = await prisma.product.findMany({
      include: {
        category: true,
        stocks: branchId ? { where: { branchId } } : true,
      },
      orderBy: { name: 'asc' },
    });

    // Fetch transaction items created in the last 7 days
    const transactionItemWhere: any = {
      transaction: {
        createdAt: { gte: sevenDaysAgo },
      },
    };

    if (branchId) {
      transactionItemWhere.transaction.branchId = branchId;
    }

    const sales7DaysGroup = await prisma.transactionItem.groupBy({
      by: ['productId'],
      _sum: {
        quantity: true,
      },
      where: transactionItemWhere,
    });

    const salesMap = new Map<string, number>(
      sales7DaysGroup.map((s: any) => [s.productId, s._sum.quantity || 0])
    );

    const reportData = products.map((product: any) => {
      const currentStock = product.stocks.reduce((acc: number, s: any) => acc + s.quantity, 0);
      const sales7Days = Number(salesMap.get(product.id) || 0);
      const weeklyVelocity = sales7Days; // sales over 1 week

      let wos = sales7Days > 0 ? Number((currentStock / sales7Days).toFixed(2)) : 999;
      let classification = 'DEAD_STOCK';
      let recommendation = 'Promote discount or audit dead stock';

      if (sales7Days === 0) {
        classification = 'DEAD_STOCK';
        recommendation = 'No sales in 7 days. Consider promotional discount or bundle.';
      } else if (wos < 2) {
        classification = 'FAST_MOVING';
        recommendation = 'Urgent restock required! Stock will deplete in less than 2 weeks.';
      } else if (wos <= 4) {
        classification = 'MEDIUM_MOVING';
        recommendation = 'Optimal inventory level maintained.';
      } else {
        classification = 'SLOW_MOVING';
        recommendation = 'Overstocked. Slow turnover detected; reduce order quantities.';
      }

      return {
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        category: product.category ? product.category.name : 'Uncategorized',
        unit: product.unit,
        costPrice: Number(product.costPrice),
        sellingPrice: Number(product.sellingPrice),
        currentStock,
        sales7Days,
        weeklyVelocity,
        weeksOfSupply: wos === 999 ? 'N/A' : wos,
        classification,
        recommendation,
      };
    });

    return NextResponse.json({ success: true, data: reportData });
  } catch (error: any) {
    console.error('Fetch Turnover Report Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch turnover report.' },
      { status: 500 }
    );
  }
}

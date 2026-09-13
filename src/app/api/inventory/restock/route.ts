import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { decodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

const restockSchema = z.object({
  branchId: z.string().min(1, 'Cabang/Gudang tujuan wajib dipilih.'),
  productId: z.string().min(1, 'Produk wajib dipilih.'),
  quantity: z.number().int().positive('Jumlah barang harus angka positif lebih dari 0.'),
  costPrice: z.number().optional(),
  supplierInvoice: z.string().optional(),
  notes: z.string().optional(),
  receivedById: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get('branchId');

    const whereClause: any = {
      mutationType: 'RESTOCK' as any,
    };
    if (branchId) {
      whereClause.branchId = branchId;
    }

    const logs = await prisma.stockLedger.findMany({
      where: whereClause,
      include: {
        branch: true,
        product: {
          include: { category: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const formatted = logs.map((log: any) => ({
      id: log.id,
      createdAt: log.createdAt,
      branchName: log.branch.name,
      productName: log.product.name,
      sku: log.product.sku,
      barcode: log.product.barcode,
      unit: log.product.unit,
      quantityChange: log.quantityChange,
      balanceAfter: log.balanceAfter,
      referenceId: log.referenceId || '-',
      description: log.description || '-',
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch Restock Logs Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil riwayat restock.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = restockSchema.parse({
      ...body,
      quantity: Number(body.quantity),
      costPrice: body.costPrice ? Number(body.costPrice) : undefined,
    });

    const {
      branchId,
      productId,
      quantity,
      costPrice,
      supplierInvoice,
      notes,
      receivedById,
    } = validatedData;

    // Resolve user context
    let activeUserId = receivedById;
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
        { success: false, message: 'Akses Ditolak: Sesi pengguna tidak ditemukan.' },
        { status: 401 }
      );
    }

    const executor = await prisma.user.findUnique({
      where: { id: activeUserId },
    });

    if (!executor || executor.role !== 'ADMIN_OWNER') {
      return NextResponse.json(
        {
          success: false,
          message: 'Akses Ditolak: Kasir tidak memiliki kewenangan menambah stok pasokan.',
        },
        { status: 403 }
      );
    }

    // Atomic transaction for restock stock intake & ledger audit
    const result = await prisma.$transaction(
      async (tx: any) => {
        // 1. Verify branch and product exist
        const branch = await tx.branch.findUnique({ where: { id: branchId } });
        if (!branch) throw new Error('Cabang/Gudang tidak ditemukan.');

        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new Error('Produk tidak ditemukan.');

        // 2. Fetch current stock balance
        const currentStock = await tx.branchStock.findUnique({
          where: {
            branchId_productId: { branchId, productId },
          },
        });

        const currentQty = currentStock ? currentStock.quantity : 0;
        const newQty = currentQty + quantity;

        // 3. Upsert BranchStock
        const updatedStock = await tx.branchStock.upsert({
          where: {
            branchId_productId: { branchId, productId },
          },
          update: {
            quantity: newQty,
          },
          create: {
            branchId,
            productId,
            quantity: newQty,
          },
        });

        // 4. Update Product master cost price if new price provided
        if (costPrice && costPrice > 0) {
          await tx.product.update({
            where: { id: productId },
            data: { costPrice },
          });
        }

        // 5. Create immutable StockLedger record
        const ledger = await tx.stockLedger.create({
          data: {
            branchId,
            productId,
            mutationType: 'RESTOCK' as any,
            quantityChange: quantity,
            balanceAfter: newQty,
            referenceId: supplierInvoice || null,
            description: `Restock Masuk: ${supplierInvoice || '-'} - ${notes || 'Penerimaan barang'}`,
          },
        });

        return {
          newQuantity: updatedStock.quantity,
          ledger,
        };
      },
      {
        timeout: 10000,
        maxWait: 5000,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Stok berhasil ditambahkan.',
      data: result,
    });
  } catch (error: any) {
    console.error('Restock API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || 'Data masukan tidak valid.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal memproses penerimaan stok.',
      },
      { status: 500 }
    );
  }
}

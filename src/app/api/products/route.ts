import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { decodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const createProductSchema = z.object({
  name: z.string().min(2, 'Nama produk minimal 2 karakter.'),
  barcode: z.string().min(3, 'Barcode minimal 3 karakter.'),
  sku: z.string().min(2, 'SKU minimal 2 karakter.'),
  categoryId: z.string().optional(),
  categoryName: z.string().optional(),
  costPrice: z.number().positive('Harga modal (HPP) harus lebih dari 0.'),
  sellingPrice: z.number().positive('Harga jual harus lebih dari 0.'),
  unit: z.string().default('PCS'),
  minStockAlert: z.number().int().nonnegative().default(5),
  initialStock: z.number().int().nonnegative().default(0),
  branchId: z.string().min(1, 'Cabang alokasi stok awal wajib dipilih.'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let branchId = searchParams.get('branchId');
    const query = searchParams.get('query');
    const categoryId = searchParams.get('categoryId');

    // 1. Resolve Target Branch:
    // If branchId is missing, empty string, "undefined", "null", or "all", find the active branch
    let targetBranch: any = null;
    if (
      branchId &&
      branchId !== 'all' &&
      branchId !== 'undefined' &&
      branchId !== 'null' &&
      branchId !== ''
    ) {
      targetBranch = await prisma.branch.findUnique({
        where: { id: branchId },
      });
    }

    // If targetBranch is invalid or inactive, fallback to the first active retail branch
    if (!targetBranch || !targetBranch.isActive) {
      targetBranch =
        (await (prisma.branch as any).findFirst({
          where: { isActive: true, isWarehouse: false },
          orderBy: { createdAt: 'asc' },
        })) ||
        (await (prisma.branch as any).findFirst({
          where: { isActive: true },
          orderBy: { createdAt: 'asc' },
        }));
    }

    if (!targetBranch) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada cabang aktif yang ditemukan', products: [], data: [] },
        { status: 404 }
      );
    }

    const activeBranchId = targetBranch.id;

    const whereClause: any = {};
    if (query) {
      whereClause.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { barcode: { contains: query, mode: 'insensitive' } },
        { sku: { contains: query, mode: 'insensitive' } },
      ];
    }
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }

    // 2. Fetch active products with their stocks relation specifically for activeBranchId
    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        category: true,
        stocks: {
          where: { branchId: activeBranchId },
        },
      },
      orderBy: { name: 'asc' },
    });

    // 3. Map products to guarantee real stock is returned
    const formattedProducts = products.map((p: any) => {
      // Direct match from the filtered stocks relation (also aliased as inventory for compatibility)
      const invRecord = p.stocks && p.stocks.length > 0 ? p.stocks[0] : null;
      const currentStock = invRecord ? Number(invRecord.quantity ?? invRecord.stock ?? 0) : 0;

      const cost = Number(p.costPrice || 0);
      const selling = Number(p.sellingPrice || p.price || 0);
      const margin = cost > 0 ? Number((((selling - cost) / cost) * 100).toFixed(1)) : 0;

      return {
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        sku: p.sku,
        description: p.description,
        category: p.category ? p.category.name : 'Uncategorized',
        categoryId: p.categoryId,
        unit: p.unit,
        price: selling,
        sellingPrice: selling,
        costPrice: cost,
        profitMarginPercent: margin,
        minStock: p.minStockAlert,
        minStockAlert: p.minStockAlert,
        stock: currentStock,
        branchId: activeBranchId,
        currentBranchId: activeBranchId,
        branchName: targetBranch.name,
        inventory: p.stocks,
        stocks: p.stocks,
        createdAt: p.createdAt,
      };
    });

    const response = NextResponse.json({
      success: true,
      branchId: activeBranchId,
      branchName: targetBranch.name,
      products: formattedProducts,
      data: formattedProducts,
    });

    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  } catch (error: any) {
    console.error('API /api/products error:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal memuat produk', message: error.message, details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Verify user RBAC: Must be ADMIN_OWNER
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

    if (!sessionUser || sessionUser.role !== 'ADMIN_OWNER') {
      return NextResponse.json(
        {
          success: false,
          message:
            'Akses Ditolak: Hanya Owner/Admin yang diizinkan menambah atau mengubah produk master.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const formattedName = typeof body.name === 'string' ? body.name.trim().toUpperCase() : body.name;
    const formattedSku = typeof body.sku === 'string' ? body.sku.trim().toUpperCase() : body.sku;

    const validated = createProductSchema.parse({
      ...body,
      name: formattedName,
      sku: formattedSku,
      costPrice: Number(body.costPrice),
      sellingPrice: Number(body.sellingPrice),
      minStockAlert: body.minStockAlert ? Number(body.minStockAlert) : 5,
      initialStock: body.initialStock ? Number(body.initialStock) : 0,
    });

    const {
      name,
      barcode,
      sku,
      categoryId,
      categoryName,
      costPrice,
      sellingPrice,
      unit,
      minStockAlert,
      initialStock,
      branchId,
    } = validated;

    // 2. Check duplicate Barcode or SKU
    const existingBarcode = await prisma.product.findUnique({
      where: { barcode },
    });
    if (existingBarcode) {
      return NextResponse.json(
        { success: false, message: `Barcode "${barcode}" sudah digunakan oleh produk lain.` },
        { status: 400 }
      );
    }

    const existingSku = await prisma.product.findUnique({
      where: { sku },
    });
    if (existingSku) {
      return NextResponse.json(
        { success: false, message: `SKU "${sku}" sudah digunakan oleh produk lain.` },
        { status: 400 }
      );
    }

    // 3. Atomic Product Creation & Multi-Branch Stock Initialization
    const newProduct = await prisma.$transaction(
      async (tx: any) => {
        let finalCategoryId = categoryId || null;
        if (!finalCategoryId && categoryName) {
          const trimmedName = categoryName.trim();
          let category = await tx.category.findFirst({
            where: { name: { equals: trimmedName, mode: 'insensitive' } },
          });
          if (!category) {
            category = await tx.category.create({ data: { name: trimmedName } });
          }
          finalCategoryId = category.id;
        }

        // Create Master Product
        const product = await tx.product.create({
          data: {
            name: name.toUpperCase(),
            barcode,
            sku,
            costPrice,
            sellingPrice,
            unit: unit.toUpperCase(),
            minStockAlert,
            categoryId: finalCategoryId,
          },
          include: { category: true },
        });

        // Fetch all branches to initialize BranchStock
        const allBranches = await tx.branch.findMany();

        for (const branch of allBranches) {
          const qty = branch.id === branchId ? initialStock : 0;

          await tx.branchStock.create({
            data: {
              branchId: branch.id,
              productId: product.id,
              quantity: qty,
            },
          });

          // Create initial StockLedger audit record if initialStock > 0
          if (branch.id === branchId && initialStock > 0) {
            await tx.stockLedger.create({
              data: {
                branchId: branch.id,
                productId: product.id,
                mutationType: 'RESTOCK' as any,
                quantityChange: initialStock,
                balanceAfter: initialStock,
                referenceId: 'INIT-STOCK',
                description: 'Saldo Awal Produk Baru',
              },
            });
          }
        }

        return product;
      },
      {
        timeout: 10000,
        maxWait: 5000,
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Master produk baru berhasil ditambahkan.',
      data: newProduct,
    });
  } catch (error: any) {
    console.error('Create Product API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          message: error.issues[0]?.message || 'Data masukan produk tidak valid.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Gagal menambahkan master produk.',
      },
      { status: 500 }
    );
  }
}

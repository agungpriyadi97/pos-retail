import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

async function getSessionUser() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('sekar_pos_session')?.value;
  if (!sessionToken) return null;

  try {
    const payload = JSON.parse(Buffer.from(sessionToken, 'base64').toString('utf-8'));
    return payload;
  } catch (error) {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const whereClause: any = {};
    if (activeOnly) {
      whereClause.isActive = true;
    }

    const branches = await prisma.branch.findMany({
      where: whereClause,
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      branches,
      data: branches,
    });
  } catch (error: any) {
    console.error('Fetch Branches Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengambil data cabang.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (user && user.role !== 'ADMIN_OWNER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Owner yang dapat menambah cabang baru.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, code, address, phone, isWarehouse = false } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Nama cabang wajib diisi.' },
        { status: 400 }
      );
    }

    if (!code || !code.trim()) {
      return NextResponse.json(
        { success: false, error: 'Kode cabang wajib diisi.' },
        { status: 400 }
      );
    }

    if (!address || !address.trim()) {
      return NextResponse.json(
        { success: false, error: 'Alamat lengkap cabang wajib diisi.' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    // Transactional branch creation + auto-inventory stock provisioning
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.branch.findUnique({
        where: { code: cleanCode },
      });

      if (existing) {
        throw new Error(`Kode cabang "${cleanCode}" sudah digunakan oleh cabang lain.`);
      }

      const newBranch = await tx.branch.create({
        data: {
          code: cleanCode,
          name: name.trim(),
          address: address.trim(),
          phone: phone ? phone.trim() : null,
          isWarehouse: Boolean(isWarehouse),
          isActive: true,
        } as any,
      });

      const products = await tx.product.findMany({
        select: { id: true },
      });

      if (products.length > 0) {
        await tx.branchStock.createMany({
          data: products.map((p) => ({
            branchId: newBranch.id,
            productId: p.id,
            quantity: 0,
          })),
          skipDuplicates: true,
        });
      }

      return newBranch;
    });

    return NextResponse.json(
      {
        success: true,
        message: `Cabang "${result.name}" berhasil dibuat dan stok awal produk diprovysi.`,
        branch: result,
        data: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create Branch Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat cabang baru.' },
      { status: 400 }
    );
  }
}

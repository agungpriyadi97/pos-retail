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

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (user && user.role !== 'ADMIN_OWNER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Owner yang dapat mengedit data cabang.' },
        { status: 403 }
      );
    }

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await req.json();
    const { name, code, address, phone, isWarehouse, isActive } = body;

    const existingBranch = await prisma.branch.findUnique({
      where: { id },
    });

    if (!existingBranch) {
      return NextResponse.json(
        { success: false, error: 'Data cabang tidak ditemukan.' },
        { status: 404 }
      );
    }

    if (code) {
      const cleanCode = code.trim().toUpperCase();
      if (cleanCode !== existingBranch.code) {
        const codeConflict = await prisma.branch.findUnique({
          where: { code: cleanCode },
        });
        if (codeConflict) {
          return NextResponse.json(
            { success: false, error: `Kode cabang "${cleanCode}" sudah digunakan oleh cabang lain.` },
            { status: 400 }
          );
        }
      }
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: {
        code: code ? code.trim().toUpperCase() : undefined,
        name: name ? name.trim() : undefined,
        address: address !== undefined ? (address ? address.trim() : null) : undefined,
        phone: phone !== undefined ? (phone ? phone.trim() : null) : undefined,
        isWarehouse: isWarehouse !== undefined ? Boolean(isWarehouse) : undefined,
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Data cabang "${updatedBranch.name}" berhasil diperbarui.`,
      branch: updatedBranch,
      data: updatedBranch,
    });
  } catch (error: any) {
    console.error('Update Branch Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memperbarui data cabang.' },
      { status: 400 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (user && user.role !== 'ADMIN_OWNER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Owner yang dapat merubah status cabang.' },
        { status: 403 }
      );
    }

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Status isActive harus berupa boolean (true/false).' },
        { status: 400 }
      );
    }

    const updatedBranch = await prisma.branch.update({
      where: { id },
      data: { isActive },
    });

    return NextResponse.json({
      success: true,
      message: `Status cabang "${updatedBranch.name}" berhasil diubah menjadi ${isActive ? 'Aktif' : 'Nonaktif'}.`,
      branch: updatedBranch,
      data: updatedBranch,
    });
  } catch (error: any) {
    console.error('Toggle Branch Status Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengubah status cabang.' },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const user = await getSessionUser();
    if (user && user.role !== 'ADMIN_OWNER' && user.role !== 'OWNER') {
      return NextResponse.json(
        { success: false, error: 'Akses ditolak: Hanya Owner yang dapat menghapus cabang.' },
        { status: 403 }
      );
    }

    const resolvedParams = await context.params;
    const { id } = resolvedParams;

    // Check associated data to guard against deleting active retail history
    const txCount = await prisma.transaction.count({ where: { branchId: id } });
    const shrinkageCount = await prisma.shrinkageLog.count({ where: { branchId: id } });
    const ledgerCount = await prisma.stockLedger.count({ where: { branchId: id } });

    if (txCount > 0 || shrinkageCount > 0 || ledgerCount > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Cabang memiliki ${txCount} transaksi dan ${ledgerCount} riwayat mutasi stok. Cabang tidak dapat dihapus. Silakan gunakan fitur Nonaktifkan.`,
        },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.branchStock.deleteMany({ where: { branchId: id } }),
      prisma.branch.delete({ where: { id } }),
    ]);

    return NextResponse.json({
      success: true,
      message: 'Cabang berhasil dihapus.',
    });
  } catch (error: any) {
    console.error('Delete Branch Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal menghapus cabang.' },
      { status: 400 }
    );
  }
}

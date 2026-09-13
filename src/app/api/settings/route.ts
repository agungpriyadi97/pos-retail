import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { cookies } from 'next/headers';

const settingsSchema = z.object({
  storeName: z.string().min(2, 'Nama toko minimal 2 karakter').max(60, 'Nama toko maksimal 60 karakter').optional(),
  pointsEarnThreshold: z.number().gt(0, 'Nilai minimal belanja harus lebih dari 0'),
  pointRedeemValue: z.number().gt(0, 'Nilai tukar poin harus lebih dari 0'),
  isLoyaltyActive: z.boolean(),
});

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

export async function GET() {
  try {
    let settings = await prisma.storeSetting.findUnique({
      where: { id: 'default_setting' },
    });

    if (!settings) {
      settings = await prisma.storeSetting.create({
        data: {
          id: 'default_setting',
          storeName: 'Sekar POS Retail',
          pointsEarnThreshold: 10000,
          pointRedeemValue: 100,
          isLoyaltyActive: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: settings.id,
        storeName: settings.storeName,
        pointsEarnThreshold: Number(settings.pointsEarnThreshold),
        pointRedeemValue: Number(settings.pointRedeemValue),
        isLoyaltyActive: settings.isLoyaltyActive,
        updatedAt: settings.updatedAt,
      },
    });
  } catch (error: any) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengambil pengaturan toko: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Sesi pengguna tidak valid' },
        { status: 401 }
      );
    }

    if (user.role !== 'ADMIN_OWNER') {
      return NextResponse.json(
        { success: false, message: 'Akses ditolak: Hanya ADMIN_OWNER yang dapat mengubah pengaturan toko' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validated = settingsSchema.parse(body);

    const updated = await prisma.storeSetting.upsert({
      where: { id: 'default_setting' },
      update: {
        storeName: validated.storeName?.trim() || undefined,
        pointsEarnThreshold: validated.pointsEarnThreshold,
        pointRedeemValue: validated.pointRedeemValue,
        isLoyaltyActive: validated.isLoyaltyActive,
      },
      create: {
        id: 'default_setting',
        storeName: validated.storeName?.trim() || 'Sekar POS Retail',
        pointsEarnThreshold: validated.pointsEarnThreshold || 10000,
        pointRedeemValue: validated.pointRedeemValue || 100,
        isLoyaltyActive: validated.isLoyaltyActive ?? true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan toko berhasil diperbarui',
      data: {
        id: updated.id,
        storeName: updated.storeName,
        pointsEarnThreshold: Number(updated.pointsEarnThreshold),
        pointRedeemValue: Number(updated.pointRedeemValue),
        isLoyaltyActive: updated.isLoyaltyActive,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || 'Data tidak valid' },
        { status: 400 }
      );
    }

    console.error('Error updating settings:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal memperbarui pengaturan toko: ' + error.message },
      { status: 500 }
    );
  }
}

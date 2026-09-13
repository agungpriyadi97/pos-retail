import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createMemberSchema = z.object({
  phone: z.string().transform((val) => val.replace(/\D/g, '')).refine((val) => val.length >= 9, {
    message: 'Nomor HP/WhatsApp minimal 9 digit angka.',
  }),
  fullName: z.string().min(2, 'Nama lengkap minimal 2 karakter.'),
});

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || searchParams.get('phone') || '';

    const whereClause: any = {};
    if (search.trim()) {
      const cleaned = search.trim();
      whereClause.OR = [
        { phone: { contains: cleaned, mode: 'insensitive' } },
        { fullName: { contains: cleaned, mode: 'insensitive' } },
      ];
    }

    const members = await prisma.member.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
    });

    const formatted = members.map((m: any) => ({
      id: m.id,
      phone: m.phone,
      fullName: m.fullName,
      points: m.points,
      totalSpend: Number(m.totalSpend),
      createdAt: m.createdAt,
      updatedAt: m.updatedAt,
    }));

    return NextResponse.json({ success: true, data: formatted });
  } catch (error: any) {
    console.error('Fetch Members Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil data member.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createMemberSchema.parse(body);
    const { phone, fullName } = validated;

    // Check if phone already registered
    const existing = await prisma.member.findUnique({
      where: { phone },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'Nomor WhatsApp/HP sudah terdaftar.' },
        { status: 400 }
      );
    }

    const newMember = await prisma.member.create({
      data: {
        phone,
        fullName: fullName.trim(),
        points: 0,
        totalSpend: 0,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Member berhasil didaftarkan.',
      data: {
        id: newMember.id,
        phone: newMember.phone,
        fullName: newMember.fullName,
        points: newMember.points,
        totalSpend: Number(newMember.totalSpend),
        createdAt: newMember.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Create Member API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || 'Data member tidak valid.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mendaftarkan member baru.' },
      { status: 500 }
    );
  }
}

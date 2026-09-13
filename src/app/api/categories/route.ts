import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Fetch Categories API Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal mengambil data kategori.' },
      { status: 500 }
    );
  }
}

const createCategorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi.'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = createCategorySchema.parse(body);
    const trimmedName = validated.name.trim();

    let category = await prisma.category.findFirst({
      where: { name: { equals: trimmedName, mode: 'insensitive' } },
    });

    if (!category) {
      category = await prisma.category.create({
        data: { name: trimmedName },
      });
    }

    return NextResponse.json({
      success: true,
      data: category,
      message: 'Kategori berhasil disiapkan.',
    });
  } catch (error: any) {
    console.error('Create Category API Error:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.issues[0]?.message || 'Data kategori tidak valid.' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, message: error.message || 'Gagal membuat kategori baru.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: branches });
  } catch (error: any) {
    console.error('Fetch Branches Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch branches.' },
      { status: 500 }
    );
  }
}

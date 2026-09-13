import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { decodeSessionToken, SESSION_COOKIE_NAME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value || cookieStore.get('session_user')?.value;

    if (token) {
      // 1. Try decode session token
      const session = decodeSessionToken(token);
      if (session) {
        const dbUser = await prisma.user.findUnique({
          where: { id: session.id },
          include: { branch: true },
        });

        if (dbUser && dbUser.isActive) {
          return NextResponse.json({
            success: true,
            user: {
              id: dbUser.id,
              username: dbUser.username,
              fullName: dbUser.fullName,
              role: dbUser.role,
              branchId: dbUser.branchId,
              branchName: dbUser.branch ? dbUser.branch.name : null,
            },
          });
        }
      }

      // 2. Try JSON parse fallback if token was JSON
      try {
        const parsed = JSON.parse(token);
        if (parsed.id) {
          const dbUser = await prisma.user.findUnique({
            where: { id: parsed.id },
            include: { branch: true },
          });

          if (dbUser && dbUser.isActive) {
            return NextResponse.json({
              success: true,
              user: {
                id: dbUser.id,
                username: dbUser.username,
                fullName: dbUser.fullName,
                role: dbUser.role,
                branchId: dbUser.branchId,
                branchName: dbUser.branch ? dbUser.branch.name : null,
              },
            });
          }
        }
      } catch (e) {}
    }

    return NextResponse.json(
      { success: false, error: 'Unauthorized: Session missing or expired.' },
      { status: 401 }
    );
  } catch (error: any) {
    console.error('Fetch Current User Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch session user.' },
      { status: 500 }
    );
  }
}

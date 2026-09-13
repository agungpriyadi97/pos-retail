import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { encodeSessionToken, verifyPassword, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      include: { branch: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: 'Username tidak ditemukan atau akun tidak aktif.' },
        { status: 401 }
      );
    }

    // Verify password if provided
    if (password) {
      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Password yang dimasukkan salah.' },
          { status: 401 }
        );
      }
    }

    const sessionUser = {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      branchId: user.branchId,
      branchName: user.branch ? user.branch.name : null,
    };

    const token = encodeSessionToken(sessionUser);
    const cookieStore = cookies();

    // Set sekar_pos_session HTTP-only cookie
    cookieStore.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: false, // development localhost
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Also set readable session cookie for client components
    cookieStore.set('session_user', JSON.stringify(sessionUser), {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({ success: true, user: sessionUser });
  } catch (error: any) {
    console.error('Login API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to authenticate user.' },
      { status: 500 }
    );
  }
}

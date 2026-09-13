import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function getSessionRole(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const jsonStr = typeof atob === 'function' ? atob(token) : Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(jsonStr);
    return parsed.role || null;
  } catch (e) {
    try {
      const parsed = JSON.parse(token);
      return parsed.role || null;
    } catch (e2) {
      return null;
    }
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionCookie =
    request.cookies.get('sekar_pos_session')?.value ||
    request.cookies.get('session_user')?.value;

  const isAuthenticated = !!sessionCookie;

  const protectedRoutes = [
    '/pos',
    '/members',
    '/shrinkage',
    '/reports',
    '/barcodes',
    '/inventory',
    '/products',
    '/settings',
  ];

  const ownerOnlyRoutes = ['/products', '/inventory/restock', '/reports', '/settings'];

  const isProtectedRoute =
    protectedRoutes.some((route) => pathname.startsWith(route)) || pathname === '/';
  const isOwnerOnlyRoute = ownerOnlyRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = pathname === '/login';

  // 1. Unauthenticated user trying to access protected routes -> redirect to /login
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated user trying to access /login -> redirect to /pos
  if (isAuthRoute && isAuthenticated) {
    const posUrl = new URL('/pos', request.url);
    return NextResponse.redirect(posUrl);
  }

  // 3. Cashier trying to access Owner-Only routes -> redirect to /pos
  if (isAuthenticated && isOwnerOnlyRoute) {
    const role = getSessionRole(sessionCookie);
    if (role === 'CASHIER') {
      const posUrl = new URL('/pos', request.url);
      return NextResponse.redirect(posUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/pos/:path*',
    '/members/:path*',
    '/shrinkage/:path*',
    '/reports/:path*',
    '/barcodes/:path*',
    '/inventory/:path*',
    '/products/:path*',
    '/settings/:path*',
    '/login',
  ],
};

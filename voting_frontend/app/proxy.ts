import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export default function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ============================================================
  // 1) TRAP: block receipt/undefined spam
  // ============================================================
  if (pathname.startsWith('/receipt/undefined/')) {
    const referer = req.headers.get('referer') || '(no referer)';
    const ua = req.headers.get('user-agent') || '(no user-agent)';

    console.log('[TRAP] blocked:', pathname);
    console.log('[TRAP] referer:', referer);
    console.log('[TRAP] ua:', ua);

    // Stop the spam cleanly
    return new NextResponse(null, { status: 204 });
  }

  // ============================================================
  // 2) ADMIN ROUTE GUARD
  //   - if logged in, /admin/login -> /admin/dashboard
  //   - if not logged in, any /admin/* (except /admin/login) -> /admin/login
  // ============================================================
  if (pathname.startsWith('/admin')) {
    const token = req.cookies.get('admin_token')?.value;

    // If already logged in, don't allow staying on /admin/login
    if (pathname === '/admin/login') {
      if (token) {
        const url = req.nextUrl.clone();
        url.pathname = '/admin/dashboard';
        return NextResponse.redirect(url);
      }
      return NextResponse.next();
    }

    // Protect everything else under /admin/*
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = '/admin/login';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/receipt/:path*', '/admin/:path*'],
};

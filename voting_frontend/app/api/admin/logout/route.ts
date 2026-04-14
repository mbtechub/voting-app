import { NextResponse } from 'next/server';

const FRONTEND_BASE_URL =
  process.env.FRONTEND_BASE_URL || 'http://127.0.0.1:3001';

export async function POST() {
  const res = NextResponse.redirect(
    new URL('/admin/login', FRONTEND_BASE_URL),
    303
  );

  // 🔥 Proper cookie deletion
  res.cookies.set({
    name: 'admin_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0), // ✅ guaranteed delete
  });

  // 🔥 Prevent caching
  res.headers.set('Cache-Control', 'no-store');

  return res;
}
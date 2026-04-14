import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set('admin_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
    expires: new Date(0), // 🔴 force immediate expiration
  });

  res.headers.set('Cache-Control', 'no-store');
  return res;
}
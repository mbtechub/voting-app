import { NextResponse } from 'next/server';

export async function GET() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set('admin_token', 'TEST', {
    httpOnly: true,
    sameSite: 'lax',
    secure: false,
    path: '/',
    maxAge: 60 * 10,
  });

  res.headers.set('Cache-Control', 'no-store');
  return res;
}

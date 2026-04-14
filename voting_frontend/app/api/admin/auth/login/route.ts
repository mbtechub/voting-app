import { NextResponse } from 'next/server';
import { backendBase } from '@/lib/env';
import { normalizeRole } from '@/lib/auth/role';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const identifier = String(body?.identifier || '').trim();
  const password = String(body?.password || '').trim();

  if (!identifier || !password) {
    return NextResponse.json({ message: 'identifier and password are required' }, { status: 400 });
  }

  const upstream = await fetch(`${backendBase}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
    cache: 'no-store',
  });

  const text = await upstream.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || 'Unexpected response from backend' };
  }

  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const token = data?.accessToken || data?.access_token || data?.token;
  if (!token) {
    return NextResponse.json(
      { message: 'Login succeeded but token is missing in response' },
      { status: 500 },
    );
  }

  const rawRole = data?.admin?.role ?? data?.role;
  const role = normalizeRole(rawRole);

  // stable response shape
  const res = NextResponse.json(
    {
      ok: true,
      role,
      admin: data?.admin ?? null,
      rawRole: rawRole != null ? String(rawRole) : undefined,
    },
    { status: 200 },
  );

  const maxAge = 60 * 60 * 24 * 7; // 7 days
  const expires = new Date(Date.now() + maxAge * 1000);

  res.cookies.set('admin_token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
    expires,
  });

  res.headers.set('Cache-Control', 'no-store');
  return res;
}
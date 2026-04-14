import { NextResponse } from 'next/server';
import { BACKEND_BASE_URL } from '@/lib/env';

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
    return NextResponse.json(
      { message: 'identifier and password are required' },
      { status: 400 },
    );
  }

  try {
    const res = await fetch(`${BACKEND_BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      body: JSON.stringify({ identifier, password }),
    });

    const text = await res.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { message: text || 'Unexpected response from backend' };
    }

    if (!res.ok) {
      return NextResponse.json(data, { status: res.status });
    }

    const token = data.accessToken || data.access_token || data.token;

    if (!token) {
      return NextResponse.json(
        { message: 'Login succeeded but token is missing in response' },
        { status: 500 },
      );
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set('admin_jwt', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { message: 'Failed to reach backend' },
      { status: 502 },
    );
  }
}

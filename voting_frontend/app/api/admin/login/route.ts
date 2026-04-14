import { NextResponse } from 'next/server';

// ✅ enforce required env (matches your rule)
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

const BACKEND_BASE_URL = requireEnv('BACKEND_BASE_URL');

export async function GET() {
  return NextResponse.json(
    { ok: true, note: 'login route is reachable' },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: Request) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { message: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const identifier = String(body?.identifier || '').trim();
  const password = String(body?.password || '').trim();

  if (!identifier || !password) {
    return NextResponse.json(
      { message: 'identifier and password are required' },
      { status: 400 }
    );
  }

  try {
    const upstream = await fetch(
      `${BACKEND_BASE_URL}/api/auth/admin/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
        cache: 'no-store',
      }
    );

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

    const token =
      data?.accessToken || data?.access_token || data?.token;

    if (!token) {
      return NextResponse.json(
        { message: 'Login succeeded but token is missing in response' },
        { status: 500 }
      );
    }

    const response = NextResponse.json(
      {
        ok: true,
        admin: data?.admin ?? null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      }
    );

    // 🔥 PRODUCTION-SAFE COOKIE
    response.cookies.set({
      name: 'admin_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // ✅ critical
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 // 1 hour
    });

    return response;
  } catch (e: any) {
    return NextResponse.json(
      {
        message: 'Failed to reach backend',
        detail: String(e?.message || e),
      },
      { status: 502 }
    );
  }
}
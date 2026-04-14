import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseId(raw: unknown) {
  const s =
    typeof raw === 'string'
      ? raw
      : Array.isArray(raw)
      ? raw[0]
      : '';

  const n = Number(String(s).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

function requireEnv(name: string) {
  const v = (process.env[name] || '').trim();
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/* ========================= GET ========================= */

export async function GET(req: Request, ctx: any) {
  try {
    const params = await ctx?.params;
    const id = parseId(params?.id);

    if (!id) {
      return NextResponse.json(
        { message: 'Invalid election id' },
        { status: 400 },
      );
    }

    const backendBase = requireEnv('BACKEND_BASE_URL');
    const backendUrl = `${backendBase}/api/admin/elections/${id}/candidates`;

    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    const res = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: 'no-store',
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err: any) {
    console.error('GET candidates proxy error:', err);

    return NextResponse.json(
      { message: 'Failed to fetch candidates' },
      { status: 500 },
    );
  }
}

/* ========================= POST (FIXED) ========================= */

export async function POST(req: Request, ctx: any) {
  try {
    const params = await ctx?.params;
    const id = parseId(params?.id);

    if (!id) {
      return NextResponse.json(
        { message: 'Invalid election id' },
        { status: 400 },
      );
    }

    const backendBase = requireEnv('BACKEND_BASE_URL');
    const backendUrl = `${backendBase}/api/admin/elections/${id}/candidates`;

    const contentType = req.headers.get('content-type') || '';

    let body: any;

    // ✅ HANDLE FORMDATA VS JSON (CRITICAL FIX)
    if (contentType.includes('multipart/form-data')) {
      body = await req.formData();
    } else {
      body = await req.json();
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    const res = await fetch(backendUrl, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
    });

    const text = await res.text();

    console.log('BACKEND RESPONSE >>>', text);

    return new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err: any) {
    console.error('POST candidate proxy error:', err);

    return NextResponse.json(
      { message: 'Failed to create candidate' },
      { status: 500 },
    );
  }
}

/* ========================= PUT ========================= */

export async function PUT(req: Request, ctx: any) {
  try {
    const params = await ctx?.params;
    const id = parseId(params?.id);

    if (!id) {
      return NextResponse.json(
        { message: 'Invalid candidate id' },
        { status: 400 },
      );
    }

    const backendBase = requireEnv('BACKEND_BASE_URL');
    const backendUrl = `${backendBase}/api/admin/candidates/${id}`;

    const contentType = req.headers.get('content-type') || '';

    let body: any;

    // ✅ HANDLE FORMDATA VS JSON
    if (contentType.includes('multipart/form-data')) {
      body = await req.formData();
    } else {
      body = await req.json();
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    const res = await fetch(backendUrl, {
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
      },
    });

    const text = await res.text();

    console.log('UPDATE RESPONSE >>>', text);

    return new NextResponse(text, {
      status: res.status,
      headers: {
        'content-type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err: any) {
    console.error('PUT candidate proxy error:', err);

    return NextResponse.json(
      { message: 'Failed to update candidate' },
      { status: 500 },
    );
  }
}
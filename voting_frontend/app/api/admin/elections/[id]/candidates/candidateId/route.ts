import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { proxyToBackend } from '@/lib/proxy';

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

/* ========================= PUT ========================= */

export async function PUT(req: Request, ctx: any) {
  try {
    const params = await ctx?.params;

    // 🔥 FIX HERE
    const id = parseId(params?.id);

    if (!id) {
      return NextResponse.json(
        { message: 'Invalid candidate id' },
        { status: 400 },
      );
    }

    const backendBase = process.env.BACKEND_BASE_URL!;
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

/* ========================= DELETE ========================= */

export async function DELETE(req: Request, ctx: any) {
  try {
    const params = await ctx?.params;

    // 🔥 FIX HERE TOO
    const id = parseId(params?.id);

    if (!id) {
      return NextResponse.json(
        { message: 'Invalid candidate id' },
        { status: 400 },
      );
    }

    return proxyToBackend(`/api/admin/candidates/${id}`, req);
  } catch (err: any) {
    console.error('DELETE candidate proxy error:', err);

    return NextResponse.json(
      { message: 'Failed to delete candidate' },
      { status: 500 },
    );
  }
}
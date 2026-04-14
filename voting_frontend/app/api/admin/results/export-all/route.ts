import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBase } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = (await cookies()).get('admin_token')?.value;
  if (!token) {
    return NextResponse.json({ ok: false, error: 'NO_ADMIN_TOKEN_COOKIE' }, { status: 401 });
  }

  const url = new URL(req.url);
  const format = (url.searchParams.get('format') || 'csv').trim();

  const upstream = await fetch(
    `${backendBase}/api/admin/results/export-all?format=${encodeURIComponent(format)}`,
    { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' },
  );

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  }

  const bytes = await upstream.arrayBuffer();
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream';
  const contentDisposition = upstream.headers.get('content-disposition') ?? 'attachment';

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'no-store',
    },
  });
}
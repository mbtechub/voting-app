import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { backendBase } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const token = (await cookies()).get('admin_token')?.value;

  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'NO_ADMIN_TOKEN_COOKIE' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get('format') || '').trim();

  if (!format) {
    return NextResponse.json(
      { ok: false, message: 'format is required' },
      { status: 400 },
    );
  }

  const upstream = await fetch(
    `${backendBase}/api/admin/results/export-winners?format=${encodeURIComponent(format)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    },
  );

  if (!upstream.ok) {
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  }

  const bytes = await upstream.arrayBuffer();

  return new NextResponse(bytes, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition':
        upstream.headers.get('content-disposition') ??
        `attachment; filename="winners-all-elections.${format}"`,
      'Cache-Control': 'no-store',
    },
  });
}
import { NextResponse } from 'next/server';
import { backendBase } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(
  req: Request,
  ctx: { params: Promise<{ cartUuid: string }> },
) {
  const { cartUuid } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${backendBase}/api/cart/${cartUuid}/item`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ cartUuid: string }> },
) {
  const { cartUuid } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${backendBase}/api/cart/${cartUuid}/item`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ cartUuid: string }> },
) {
  const { cartUuid } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${backendBase}/api/cart/${cartUuid}/item`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
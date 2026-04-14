import { NextResponse } from 'next/server';
import { backendBase } from '@/lib/env';

export const dynamic = 'force-dynamic';

// ✅ helper to normalize response
function normalizeCart(data: any) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return {
    ...data,
    items,
    cartCount: items.length, // 🔥 IMPORTANT for header
  };
}

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

  const raw = await res.json().catch(() => ({}));
  const data = normalizeCart(raw);

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

  const raw = await res.json().catch(() => ({}));
  const data = normalizeCart(raw);

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

  const raw = await res.json().catch(() => ({}));
  const data = normalizeCart(raw);

  return NextResponse.json(data, { status: res.status });
}
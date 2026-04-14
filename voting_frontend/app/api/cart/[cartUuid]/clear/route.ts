import { NextResponse } from 'next/server';
import { backendBase } from '@/lib/env';

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ cartUuid: string }> }
) {
  const { cartUuid } = await ctx.params;

  const res = await fetch(
    `${backendBase}/api/cart/${cartUuid}/clear`,
    {
      method: 'DELETE',
      cache: 'no-store',
    }
  );

  const text = await res.text();

  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
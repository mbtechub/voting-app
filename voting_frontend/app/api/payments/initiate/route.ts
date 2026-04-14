import { NextResponse } from 'next/server';
import { backendBase } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const res = await fetch(`${backendBase}/api/payments/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      cartUuid: body?.cartUuid,
      email: body?.email,
    }),
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
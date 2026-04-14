import { NextResponse } from 'next/server';
import { backendBase } from '@/lib/env';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.text();

  const res = await fetch(`${backendBase}/api/public/cart`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    cache: 'no-store',
  });

  const text = await res.text(); // <-- capture raw
  console.log('POST /api/public/cart -> backend status:', res.status);
  console.log('backend response:', text);

  // Return the backend response back to the browser
  return new NextResponse(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
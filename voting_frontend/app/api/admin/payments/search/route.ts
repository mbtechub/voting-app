import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get('q') || '').trim();

  if (!q) {
    return NextResponse.json(
      { message: 'q is required' },
      { status: 400 }
    );
  }

  // Preserve query string automatically by passing req
  return proxyToBackend('/api/admin/payments/search', req);
}

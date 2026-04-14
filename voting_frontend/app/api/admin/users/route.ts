import { NextResponse } from 'next/server';
import { proxyToBackend, proxyAdminGet } from '@/lib/proxy';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const limitRaw = (searchParams.get('limit') || '100').trim();

    const limit = Number(limitRaw);
    if (Number.isNaN(limit) || limit <= 0) {
      return NextResponse.json({ message: 'limit must be a positive number' }, { status: 400 });
    }

    // IMPORTANT: proxyAdminGet in your project expects ONE arg
    return await proxyAdminGet(`/api/admin/users?limit=${encodeURIComponent(String(limit))}`);
  } catch (e: any) {
    return NextResponse.json(
      { message: 'users route failed', detail: e?.message || String(e) },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    return await proxyToBackend('/api/admin/users', req);
  } catch (e: any) {
    return NextResponse.json(
      { message: 'users create route failed', detail: e?.message || String(e) },
      { status: 500 },
    );
  }
}

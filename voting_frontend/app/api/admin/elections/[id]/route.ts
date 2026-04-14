import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function parseId(raw: unknown) {
  const s = typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : '';
  const n = Number(String(s).trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export async function GET(req: Request, ctx: any) {
  const p = await ctx?.params; // Next 16 can make params async
  const id = parseId(p?.id);

  if (!id) {
    return NextResponse.json({ message: 'Invalid election id' }, { status: 400 });
  }

  return proxyToBackend(`/api/admin/elections/${id}`, req);
}

export async function PATCH(req: Request, ctx: any) {
  const p = await ctx?.params;
  const id = parseId(p?.id);

  if (!id) {
    return NextResponse.json({ message: 'Invalid election id' }, { status: 400 });
  }

  return proxyToBackend(`/api/admin/elections/${id}`, req);
}
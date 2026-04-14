import { NextResponse } from 'next/server';
import { cookies, headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const h = await headers();

  const rawCookieHeader = h.get('cookie') || '';

  return NextResponse.json({
    ok: true,
    rawCookieHeader,
    cookieNames: cookieStore.getAll().map((c) => c.name),
    adminTokenLen: cookieStore.get('admin_token')?.value?.length || 0,
  });
}

import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function PATCH(req: Request) {
  // forwards /api/admin/users/:adminId automatically from req.url pathname
  // but proxyToBackend needs backend path only:
  const url = new URL(req.url);
  const adminId = url.pathname.split('/').pop();

  if (!adminId) {
    return NextResponse.json({ message: 'adminId is required' }, { status: 400 });
  }

  return proxyToBackend(`/api/admin/users/${encodeURIComponent(adminId)}`, req);
}

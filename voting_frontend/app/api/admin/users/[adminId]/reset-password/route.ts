import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export async function POST(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split('/');
  const adminId = parts[parts.length - 2]; // .../users/[adminId]/reset-password

  if (!adminId) {
    return NextResponse.json({ message: 'adminId is required' }, { status: 400 });
  }

  return proxyToBackend(
    `/api/admin/users/${encodeURIComponent(adminId)}/reset-password`,
    req,
  );
}

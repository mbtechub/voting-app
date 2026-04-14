import { NextResponse } from 'next/server';
import { proxyToBackend } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get('electionId');

  if (!raw) {
    return NextResponse.json({ message: 'electionId is required' }, { status: 400 });
  }

  const electionId = raw.trim();

  // ✅ strict numeric string validation
  if (!/^[0-9]+$/.test(electionId)) {
    return NextResponse.json(
      { message: 'Validation failed (numeric string is expected)' },
      { status: 400 },
    );
  }

  // ✅ IMPORTANT: forward to the REAL backend route
  // and let proxy forward query string
  return proxyToBackend('/api/admin/results/live', req, { requireAdmin: true });
}
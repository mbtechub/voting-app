import { NextResponse } from 'next/server';
import { proxyAdminGet } from '@/lib/proxy';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const limitRaw = (searchParams.get('limit') || '').trim();
  const referenceRaw = (searchParams.get('reference') || '').trim();

  // Validate limit if provided
  if (limitRaw) {
    const limit = Number(limitRaw);
    if (Number.isNaN(limit) || limit <= 0) {
      return NextResponse.json(
        { message: 'limit must be a positive number' },
        { status: 400 },
      );
    }
    if (limit > 200) {
      return NextResponse.json(
        { message: 'limit max is 200' },
        { status: 400 },
      );
    }
  }

  if (referenceRaw && referenceRaw.length > 120) {
    return NextResponse.json(
      { message: 'reference is too long' },
      { status: 400 },
    );
  }

  // Build query string manually
  const qs = searchParams.toString();
  const backendPath = qs
    ? `/api/admin/webhooks/recent?${qs}`
    : '/api/admin/webhooks/recent';

    return proxyAdminGet(backendPath);
}

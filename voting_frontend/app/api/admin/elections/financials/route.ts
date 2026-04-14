import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_BASE_URL } from '@/lib/env';
import { proxyToBackend } from '@/lib/proxy';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('admin_token')?.value;

  if (!token) {
    return NextResponse.json(
      { message: 'Unauthorized: no admin_token cookie' },
      { status: 401 },
    );
  }

  try {
    const upstream = await fetch(`${BACKEND_BASE_URL}/api/admin/elections/financials`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await upstream.text();

    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/json',
        'cache-control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        message: 'Failed to reach backend',
        detail: String(error?.message || error),
      },
      { status: 502 },
    );
  }
}

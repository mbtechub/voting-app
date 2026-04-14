import { NextResponse } from 'next/server';
import { BACKEND_BASE_URL } from '@/lib/env';

export async function GET(
  _req: Request,
  context: { params: Promise<{ reference: string }> },
) {
  const { reference } = await context.params;

  const decoded = decodeURIComponent(reference || '').trim();
  if (!decoded) {
    return NextResponse.json({ message: 'Missing reference' }, { status: 400 });
  }

  const url = `${BACKEND_BASE_URL}/api/public/receipt/${encodeURIComponent(decoded)}/pdf`;

  try {
    const res = await fetch(url, { cache: 'no-store' });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { message: 'Failed to fetch PDF', details: text },
        { status: res.status },
      );
    }

    const arrayBuffer = await res.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${decoded}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return NextResponse.json(
      { message: 'Failed to reach backend' },
      { status: 502 },
    );
  }
}

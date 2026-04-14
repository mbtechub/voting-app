import { proxyAdminGet } from '@/lib/proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = searchParams.get('limit') ?? '10';

  return proxyAdminGet(
    `/api/admin/dashboard/top-candidates?limit=${encodeURIComponent(limit)}`
  );
}
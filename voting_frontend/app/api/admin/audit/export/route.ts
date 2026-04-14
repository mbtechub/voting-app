import { proxyToBackend } from '@/lib/proxy';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return proxyToBackend('/api/admin/audit/export', req);
}
import { proxyToBackend } from '@/lib/proxy';

export async function GET(req: Request) {
  return proxyToBackend('/api/admin/dashboard/summary', req, {
    requireAdmin: true,
  });
}

import { proxyToBackend } from '@/lib/proxy';

export async function GET(req: Request) {
  return proxyToBackend('/api/public/elections', req, {
    requireAdmin: false,
  });
}
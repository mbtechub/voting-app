import { proxyToBackend } from '@/lib/proxy';

export async function GET(req: Request) {
  return proxyToBackend(
    '/api/admin/payments/recovery/pending',
    req,
    {
      requireAdmin: true,
    },
  );
}
import { proxyToBackend } from '@/lib/proxy';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// LIST elections: supports ?status=&q=
export async function GET(req: Request) {
  return proxyToBackend('/api/admin/elections', req, { requireAdmin: true });
}

// CREATE election
export async function POST(req: Request) {
  return proxyToBackend('/api/admin/elections', req, { requireAdmin: true });
}
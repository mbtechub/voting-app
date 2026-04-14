import { proxyAdminGet } from '@/lib/proxy';

export async function GET() {
  return proxyAdminGet('/api/admin/dashboard/revenue-30d');
}

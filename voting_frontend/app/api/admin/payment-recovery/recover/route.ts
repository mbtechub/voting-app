// app/api/admin/payment-recovery/recover/route.ts

import { proxyToBackend } from '@/lib/proxy';

export async function POST(req: Request) {
  return proxyToBackend(
    '/api/payments/recover',
    req,
    {
      requireAdmin: true,
    },
  );
}
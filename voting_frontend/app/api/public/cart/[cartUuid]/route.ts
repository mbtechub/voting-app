import { proxyToBackend } from '@/lib/proxy';

export async function GET(
  req: Request,
  ctx: { params: Promise<{ cartUuid: string }> }
) {
  const { cartUuid } = await ctx.params;

  return proxyToBackend(`/api/public/cart/${encodeURIComponent(cartUuid)}`, req, {
    requireAdmin: false,
  });
}
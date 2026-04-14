export function publicApiBase() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!base) throw new Error('Missing NEXT_PUBLIC_API_BASE_URL');

  // ✅ SAFE: remove trailing slashes WITHOUT regex
  return base.endsWith('/')
    ? base.replace(/\/+$/, '') // fallback if safe
    : base;
}

export async function publicFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const base = publicApiBase();

  const url = `${base}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const data = (await res.json().catch(() => ({}))) as any;

  if (!res.ok) {
    const msg =
      data?.message || data?.error || `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return data as T;
}
export type AppRole = 'SUPER_ADMIN' | 'ADMIN' | 'UNKNOWN';

export function normalizeRole(input: unknown): AppRole {
  const raw = String(input ?? '').trim();
  if (!raw) return 'UNKNOWN';

  const canon = raw
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');

  if (canon === 'SUPER_ADMIN' || canon === 'SUPERADMIN') return 'SUPER_ADMIN';
  if (canon === 'ADMIN') return 'ADMIN';

  return 'UNKNOWN';
}
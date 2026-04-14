'use client';

import { useEffect, useState } from 'react';
import { normalizeRole, type AppRole } from '@/lib/auth/role';

type WhoAmIStable = {
  ok: boolean;
  role: AppRole;
  admin: null | {
    adminId?: number;
    email?: string;
    username?: string;
    isActive?: boolean;
  };
  message?: string;
};

export default function AdminTopbar() {
  const [role, setRole] = useState<AppRole>('UNKNOWN');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadWhoami() {
      try {
        const res = await fetch('/api/admin/auth/whoami', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) return;

        const data = (await res.json().catch(() => null)) as WhoAmIStable | null;
        if (cancelled || !data?.ok) return;

        setRole(normalizeRole(data.role));
        setUsername(data.admin?.username || '');
        setEmail(data.admin?.email || '');
      } catch {
        // ignore
      }
    }

    loadWhoami();
    return () => {
      cancelled = true;
    };
  }, []);

  async function logout() {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      window.location.assign('/admin/login');
    }
  }

  const displayName = username || email || 'Admin User';

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Admin Panel
        </p>
        <p className="mt-1 text-sm text-slate-700">
          <span className="font-semibold text-slate-900">{displayName}</span>
          {role !== 'UNKNOWN' ? ` • ${role}` : ''}
        </p>
      </div>

      <button
        type="button"
        onClick={logout}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
      >
        Logout
      </button>
    </div>
  );
}
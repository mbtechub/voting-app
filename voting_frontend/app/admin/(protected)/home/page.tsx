'use client';

import React, { useEffect, useState } from 'react';
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

function ActionCard({
  title,
  desc,
  href,
}: {
  title: string;
  desc: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-base font-bold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-600">{desc}</div>
      <div className="mt-4 text-sm font-semibold text-blue-700">Open →</div>
    </a>
  );
}

export default function AdminHomePage() {
  const [role, setRole] = useState<AppRole>('UNKNOWN');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/auth/whoami', {
          method: 'GET', // ✅ added
          cache: 'no-store',
          credentials: 'include',
          headers: { Accept: 'application/json' },
        });

        if (!res.ok) {
          window.location.replace('/admin/login');
          return;
        }

        const who = (await res.json().catch(() => null)) as WhoAmIStable | null;
        const r = normalizeRole(who?.role);

        if (cancelled) return;

        setRole(r);

        if (r === 'SUPER_ADMIN') {
          window.location.replace('/admin/dashboard');
          return;
        }

        if (r !== 'ADMIN') {
          window.location.replace('/admin/login');
          return;
        }
      } catch {
        window.location.replace('/admin/login');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="px-4 py-8 sm:px-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Loading…</h1>
          <p className="mt-2 text-sm text-slate-600">Preparing your workspace.</p>
        </div>
      </div>
    );
  }

  if (role !== 'ADMIN') return null;

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Admin Workspace
        </div>

        <h1 className="mt-4 text-3xl font-bold">Welcome back</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
          Manage election records and search payment activity from your admin workspace.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ActionCard
          title="Election Management"
          desc="Create and manage elections and candidates based on your access level."
          href="/admin/elections-crud"
        />
        <ActionCard
          title="Search Payment"
          desc="Search payments by reference, cart UUID, or receipt lookup key."
          href="/admin/payments"
        />
      </div>
    </div>
  );
}
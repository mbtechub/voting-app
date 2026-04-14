'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Vote,
  Wallet,
  Search,
  Zap,
  Users,
  BarChart3,
  ClipboardList,
} from 'lucide-react';
import { normalizeRole, type AppRole } from '@/lib/auth/role';

type WhoAmIStable = {
  ok: boolean;
  role: AppRole;
  admin: null | {
    adminId?: number;
    email?: string;
    username?: string;
    isActive?: boolean;
    firstName?: string;
    lastName?: string;
  };
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  superOnly?: boolean;
};

function isActiveLink(pathname: string | null, href: string) {
  const p = pathname || '';
  if (!p) return false;
  if (p === href) return true;
  if (href !== '/admin/dashboard' && p.startsWith(href + '/')) return true;
  return false;
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={() => onNavigate?.()}
      className={`relative flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm font-semibold transition sm:px-4 ${
        active
          ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
          : 'border-transparent bg-white text-slate-700 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-blue-400" />
      )}

      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          active ? 'bg-white/10' : 'bg-slate-100'
        }`}
      >
        <Icon size={18} />
      </div>

      <span className="truncate">{label}</span>
    </Link>
  );
}

function getRoleBadgeClass(role: AppRole) {
  if (role === 'SUPER_ADMIN') {
    return 'border-blue-200 bg-blue-100 text-blue-700';
  }
  if (role === 'ADMIN') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }
  return 'border-gray-200 bg-gray-100 text-gray-600';
}

export default function AdminSidebar({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  const [role, setRole] = useState<AppRole>('UNKNOWN');
  const [loadingRole, setLoadingRole] = useState(true);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const isSuper = useMemo(() => role === 'SUPER_ADMIN', [role]);

  const nav: NavItem[] = useMemo(
    () => [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, superOnly: true },
      { label: 'Poll Management', href: '/admin/elections-crud', icon: Vote },
      { label: 'Poll Financials', href: '/admin/elections', icon: Wallet, superOnly: true },
      { label: 'Search Payment', href: '/admin/payments', icon: Search },
      { label: 'Payment Events', href: '/admin/webhooks', icon: Zap, superOnly: true },
      { label: 'Admin Users Management', href: '/admin/users', icon: Users, superOnly: true },
      { label: 'Results', href: '/admin/results', icon: BarChart3, superOnly: true },
      { label: 'Audit Logs', href: '/admin/audit', icon: ClipboardList, superOnly: true },
    ],
    []
  );

  const visibleNav = useMemo(() => {
    if (isSuper) return nav;

    return nav
      .filter((x) => !x.superOnly)
      .filter((x) =>
        ['/admin/elections-crud', '/admin/payments'].includes(x.href)
      );
  }, [isSuper, nav]);

  const displayName = useMemo(() => {
    const full = `${firstName} ${lastName}`.trim();
    if (full) return full;

    if (username.trim()) {
      return username
        .trim()
        .replace(/[_\-.]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return 'Admin User';
  }, [firstName, lastName, username]);

  const initials = useMemo(() => {
    const parts = displayName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    }
    return displayName.slice(0, 2).toUpperCase();
  }, [displayName]);

  useEffect(() => {
    let cancelled = false;

    async function loadWhoami() {
      setLoadingRole(true);

      try {
        const res = await fetch('/api/admin/auth/whoami', {
          method: 'GET',
          cache: 'no-store',
          credentials: 'include',
        });

        const data = (await res.json().catch(() => null)) as WhoAmIStable | null;

        if (cancelled) return;

        // 🔥 HARD FAIL → prevents role loop
        if (!res.ok || !data?.ok) {
          window.location.replace('/admin/login');
          return;
        }

        setRole(normalizeRole(data.role));
        setUsername(data.admin?.username || '');
        setFirstName(data.admin?.firstName || '');
        setLastName(data.admin?.lastName || '');
      } catch {
        if (!cancelled) {
          window.location.replace('/admin/login');
        }
      } finally {
        if (!cancelled) setLoadingRole(false);
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
      // 🔥 replace prevents back navigation into protected pages
      window.location.replace('/admin/login');
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-bold text-white sm:h-12 sm:w-12">
            {loadingRole ? '...' : initials}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 sm:text-base">
              {loadingRole ? 'Loading...' : displayName}
            </p>

            <div
              className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${getRoleBadgeClass(
                role
              )}`}
            >
              {role === 'UNKNOWN' ? 'Admin User' : role.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <nav className="grid grid-cols-1 gap-2">
          {visibleNav.map((item) => {
            const active = isActiveLink(pathname, item.href);

            return (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={active}
                onNavigate={onNavigate}
              />
            );
          })}
        </nav>
      </div>

      <div className="pt-4 lg:hidden">
        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-600"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
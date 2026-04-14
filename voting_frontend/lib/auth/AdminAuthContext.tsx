'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { normalizeRole, type AppRole } from '@/lib/auth/role';

type Admin = {
  adminId?: number;
  email?: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  isActive?: boolean;
};

type AuthState = {
  role: AppRole;
  admin: Admin | null;
  loading: boolean;
  logout: () => Promise<void>;
};

const AdminAuthContext = createContext<AuthState | null>(null);

export function AdminAuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [role, setRole] = useState<AppRole>('UNKNOWN');
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/admin/auth/whoami', {
          credentials: 'include',
          cache: 'no-store',
        });

        const data = await res.json().catch(() => null);

        if (cancelled) return;

        if (!res.ok || !data?.ok) {
          window.location.replace('/admin/login');
          return;
        }

        setRole(normalizeRole(data.role));
        setAdmin(data.admin || null);
      } catch {
        if (!cancelled) {
          window.location.replace('/admin/login');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

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
      window.location.replace('/admin/login');
    }
  }

  return (
    <AdminAuthContext.Provider
      value={{
        role,
        admin,
        loading,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider');
  }
  return ctx;
}
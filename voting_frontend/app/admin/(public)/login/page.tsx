'use client';

import { useState } from 'react';
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

export default function AdminLoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setError(null);
    setLoading(true);

    const cleanIdentifier = String(identifier || '').trim();
    const cleanPassword = String(password || '').trim();

    if (!cleanIdentifier || !cleanPassword) {
      setError('Username/Email and password are required.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        cache: 'no-store',
        body: JSON.stringify({
          identifier: cleanIdentifier,
          password: cleanPassword,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.message || `Login failed (${res.status})`);
        return;
      }

      const whoamiRes = await fetch('/api/admin/auth/whoami', {
        cache: 'no-store',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!whoamiRes.ok) {
        const whoamiText = await whoamiRes.text().catch(() => '');
        setError(
          `Login succeeded but session not established (whoami ${whoamiRes.status}). ${whoamiText}`,
        );
        return;
      }

      const who = (await whoamiRes.json().catch(() => ({}))) as WhoAmIStable;
      const role = normalizeRole(who?.role);

      if (role === 'SUPER_ADMIN') {
        window.location.replace('/admin/dashboard');
      } else {
        window.location.replace('/admin/home');
      }
    } catch (err: any) {
      setError(err?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-slate-50 px-6 py-10">
      <div className="mx-auto grid min-h-[85vh] max-w-7xl items-center gap-10 lg:grid-cols-2 lg:px-8">

        {/* Left Branding Section */}
        <div className="hidden lg:block">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-10 text-white shadow-2xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_35%)]" />

            <div className="relative">
              <div className="mb-6 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
                Admin Access
              </div>

              <h1 className="text-4xl font-bold leading-tight">
                Welcome back to VOTING PAGE
              </h1>

              <p className="mt-5 max-w-xl text-base leading-7 text-blue-100">
                Sign in to manage polls, payments, receipts, results, and admin
                activities from one secure dashboard.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-semibold">Secure Access</p>
                  <p className="mt-2 text-sm text-blue-100">
                    Login with your username or email and continue to your admin
                    workspace.
                  </p>
                </div>

                <div className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                  <p className="text-sm font-semibold">Role-Based Dashboard</p>
                  <p className="mt-2 text-sm text-blue-100">
                    Super Admin and Admin users are redirected to the right
                    panel automatically.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

       {/* Login Card */}
<div className="mx-auto w-full max-w-md">
  <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">

    <div className="mb-8 text-center">
      {(() => {
        const logoUrl = process.env.NEXT_PUBLIC_LOGO_URL;

        return (
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-blue-900 shadow-md overflow-hidden">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Logo"
                className="h-full w-full object-contain bg-white p-2"
              />
            ) : (
              <span className="text-lg font-bold text-white">VP</span>
            )}
          </div>
        );
      })()}

      <h2 className="text-3xl font-bold text-slate-900">
        Admin Login
      </h2>
              <p className="mt-2 text-sm text-slate-600">
                Enter your credentials to access the admin panel.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Username or Email
                </label>

                <input
                  name="identifier"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  autoComplete="username"
                  placeholder="Enter your username or email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-800">
                  Password
                </label>

                <input
                  type="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                />
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>

            </form>
          </div>
        </div>

      </div>
    </main>
  );
}
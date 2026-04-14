'use client';

import { useEffect, useState } from 'react';

type AdminUser = {
  adminId: number;
  username: string;
  email: string;
  roleId: number;
  isActive: 'Y' | 'N';
  createdAt?: string | null;
  lastLogin?: string | null;
};

function toErrorMessage(payload: any): string {
  if (!payload) return 'Something went wrong';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload?.message)) return payload.message.join('\n');
  if (typeof payload?.message === 'string') return payload.message;
  if (typeof payload?.error === 'string') return payload.error;
  try {
    return JSON.stringify(payload);
  } catch {
    return 'Something went wrong';
  }
}

async function readApiError(res: Response): Promise<string> {
  try {
    const json = await res.json();
    return toErrorMessage(json);
  } catch {
    const text = await res.text().catch(() => '');
    return text || `Request failed (${res.status})`;
  }
}

function roleLabel(roleId: number) {
  if (Number(roleId) === 1) return 'SUPER ADMIN';
  if (Number(roleId) === 2) return 'ADMIN';
  return `ROLE ${roleId}`;
}

function statusBadgeClass(isActive: 'Y' | 'N') {
  return isActive === 'Y'
    ? 'border-green-200 bg-green-100 text-green-700'
    : 'border-red-200 bg-red-100 text-red-700';
}

export default function UsersClient() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState('2');
  const [password, setPassword] = useState('');

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'GET', // ✅ added
        cache: 'no-store',
        credentials: 'include',
        headers: {
          Accept: 'application/json', // ✅ added
        },
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : [];
      setRows(items);
    } catch (e: any) {
      setErr(e?.message || 'Failed to load users');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createUser() {
    setErr(null);

    const u = username.trim();
    const em = email.trim();
    const pw = password.trim();
    const rid = Number(roleId);

    if (!u) return setErr('Username is required');
    if (!em) return setErr('Email is required');
    if (!Number.isFinite(rid) || rid <= 0) {
      return setErr('Please select a valid role');
    }
    if (pw.length < 6) return setErr('Password must be at least 6 characters');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json', // ✅ added
        },
        body: JSON.stringify({
          username: u,
          email: em,
          password: pw,
          roleId: rid,
          isActive: 'Y',
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      setUsername('');
      setEmail('');
      setPassword('');
      setRoleId('2');

      await load();
    } catch (e: any) {
      setErr(e?.message || 'Create failed');
    }
  }

  async function toggleActive(u: AdminUser) {
    const next = u.isActive === 'Y' ? 'N' : 'Y';

    const ok = window.confirm(
      `${next === 'N' ? 'Deactivate' : 'Activate'} ${u.username}?`,
    );
    if (!ok) return;

    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${u.adminId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json', // ✅ added
        },
        body: JSON.stringify({ isActive: next }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || 'Update failed');
    }
  }

  async function changeRole(u: AdminUser, newRoleId: number) {
    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${u.adminId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json', // ✅ added
        },
        body: JSON.stringify({ roleId: newRoleId }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      await load();
    } catch (e: any) {
      setErr(e?.message || 'Role update failed');
    }
  }

  async function resetPassword(u: AdminUser) {
    const pw = (window.prompt(`Enter new password for ${u.username}:`) || '').trim();
    if (!pw) return;

    if (pw.length < 6) {
      setErr('Password must be at least 6 characters');
      return;
    }

    setErr(null);
    try {
      const res = await fetch(`/api/admin/users/${u.adminId}/reset-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json', // ✅ added
        },
        body: JSON.stringify({ newPassword: pw }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      alert('Password updated');
    } catch (e: any) {
      setErr(e?.message || 'Password reset failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Create Admin User</h2>
        <p className="mt-2 text-sm text-slate-500">
          Add a new admin account and assign the appropriate access level.
        </p>

        <div className="mt-5 grid gap-4 lg:max-w-3xl lg:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-800">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">
              Role
            </label>
            <select
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="1">SUPER ADMIN</option>
              <option value="2">ADMIN</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-800">
              Password
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 6 chars)"
              type="password"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={createUser}
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Reload
          </button>

          {loading ? (
            <span className="text-sm text-slate-500">Loading…</span>
          ) : null}
        </div>

        {err ? (
          <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {err}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                {['ID', 'Username', 'Email', 'Role', 'Active', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>

            <tbody>
              {rows.map((u) => (
                <tr key={u.adminId}>
                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                    {u.adminId}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900">
                    {u.username}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                    {u.email}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                    <div className="flex items-center gap-3">
                      <select
                        value={String(u.roleId)}
                        onChange={(e) => changeRole(u, Number(e.target.value))}
                        className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      >
                        <option value="1">SUPER ADMIN</option>
                        <option value="2">ADMIN</option>
                      </select>

                      <span className="text-xs text-slate-500">
                        {roleLabel(u.roleId)}
                      </span>
                    </div>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                        u.isActive,
                      )}`}
                    >
                      {u.isActive === 'Y' ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => toggleActive(u)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {u.isActive === 'Y' ? 'Deactivate' : 'Activate'}
                      </button>

                      <button
                        onClick={() => resetPassword(u)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Reset Password
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-sm text-slate-500">
                    No users yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
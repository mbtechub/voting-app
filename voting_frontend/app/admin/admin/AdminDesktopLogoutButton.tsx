'use client';

import { useState } from 'react';

export default function AdminDesktopLogoutButton() {
  const [loading, setLoading] = useState(false);

  async function logout() {
    if (loading) return;

    setLoading(true);

    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout failed:', err);
      // still proceed to redirect (important)
    } finally {
      window.location.replace('/admin/login'); // 🔥 better than assign
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      disabled={loading}
      className="hidden lg:inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
'use client';

export default function AdminDesktopLogoutButton() {
  async function logout() {
    try {
      await fetch('/api/admin/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignore fetch failure and still move user out
    } finally {
      window.location.assign('/admin/login');
    }
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-red-600"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7"
        />
      </svg>
      Logout
    </button>
  );
}
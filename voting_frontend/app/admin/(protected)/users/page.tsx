import UsersClient from './users-client';

export const dynamic = 'force-dynamic';

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Admin Management
        </div>

        <h1 className="mt-4 text-3xl font-bold">Admin Users</h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Create admin accounts, manage access levels, activate or deactivate
          administrators, and reset passwords from one central control panel.
        </p>
      </div>

      <UsersClient />
    </div>
  );
}
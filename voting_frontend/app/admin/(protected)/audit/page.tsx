import AuditClient from './audit-client';

export const dynamic = 'force-dynamic';

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Audit & Compliance
        </div>

        <h1 className="mt-4 text-3xl font-bold">System Audit Log</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Review tracked admin activity across security, poll management,
          payments, exports, and operational events from one central audit
          trail.
        </p>
      </div>

      <AuditClient />
    </div>
  );
}
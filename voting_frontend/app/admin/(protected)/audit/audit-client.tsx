'use client';

import { useEffect, useMemo, useState } from 'react';

type AuditRow = {
  auditId: number;
  adminUsername: string | null;
  action: string;
  module: string;
  target: string | null;
  status: string | null;
  message: string | null;
  createdAt: string;
};

type ApiResponse = {
  count: number;
  items: AuditRow[];
};

type ParsedMessage = {
  method?: string | null;
  path?: string | null;
  ip?: string | null;
  outcome?: string | null;
  error?: string | null;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  responseSummary?: Record<string, unknown> | null;
  truncated?: boolean;
  note?: string | null;
};

function fmtDate(s?: string | null) {
  if (!s) return '';
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function statusBadge(status?: string | null) {
  const v = String(status || '').toUpperCase();

  if (v === 'SUCCESS') {
    return 'border-green-200 bg-green-100 text-green-700';
  }

  if (v === 'FAILED' || v === 'ERROR') {
    return 'border-red-200 bg-red-100 text-red-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function moduleBadge(moduleName?: string | null) {
  const v = String(moduleName || '').toUpperCase();

  if (v === 'ADMIN') return 'border-blue-200 bg-blue-50 text-blue-700';
  if (v === 'AUDIT') return 'border-purple-200 bg-purple-50 text-purple-700';
  if (v === 'WEBHOOK') return 'border-amber-200 bg-amber-50 text-amber-700';
  if (v === 'PAYMENT') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (v === 'POLL') return 'border-sky-200 bg-sky-50 text-sky-700';
  if (v === 'NOMINEE') return 'border-pink-200 bg-pink-50 text-pink-700';

  return 'border-slate-200 bg-slate-50 text-slate-700';
}

function Pill({
  text,
  className,
}: {
  text: string;
  className: string;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {text}
    </span>
  );
}

function tryParseMessage(message?: string | null): ParsedMessage | null {
  if (!message) return null;

  try {
    const parsed = JSON.parse(message);
    if (parsed && typeof parsed === 'object') {
      return parsed as ParsedMessage;
    }
    return null;
  } catch {
    return null;
  }
}

function formatTarget(moduleName?: string | null, target?: string | null) {
  const mod = String(moduleName || '').toUpperCase();
  const value = String(target || '').trim();

  if (!value || value === '-' || value === 'null' || value === 'undefined') {
    if (mod === 'AUDIT') return 'Audit Logs';
    if (mod === 'WEBHOOK') return 'Webhook Events';
    if (mod === 'PAYMENT') return 'Payment Records';
    if (mod === 'RESULT') return 'Results';
    return '—';
  }

  if (mod === 'ADMIN') return 'Admin';
  if (mod === 'POLL') return 'Poll';
  if (mod === 'NOMINEE') return 'Nominee';
  if (mod === 'WEBHOOK') return 'Webhook';
  if (mod === 'PAYMENT') return 'Payment';
  if (mod === 'RESULT') return 'Result';

  return moduleName || 'Record';
}

function buildDetailsText(row: AuditRow, parsed: ParsedMessage | null) {
  const actor = row.adminUsername || 'Admin User';
  const action = String(row.action || '').toUpperCase();

  if (action === 'VIEW_AUDIT_LOGS') {
    return `${actor} viewed audit logs.`;
  }

  if (action === 'VIEW_WEBHOOK_EVENTS') {
    return `${actor} viewed webhook events.`;
  }

  if (action === 'SEARCH_PAYMENT') {
    return `${actor} searched payment records.`;
  }

  if (action === 'RESET_ADMIN_PASSWORD') {
    return `${actor} reset an admin password.`;
  }

  if (action === 'ADMIN_ROLE_CHANGE') {
    return `${actor} updated an admin record.`;
  }

  if (action === 'CREATE_ADMIN_USER') {
    return `${actor} created a new admin user.`;
  }

  if (action === 'EXPORT_AUDIT_LOGS') {
    return `${actor} exported audit logs.`;
  }

  if (action === 'EXPORT_RESULTS_SINGLE') {
    return `${actor} exported a single result report.`;
  }

  if (action === 'EXPORT_RESULTS_ALL') {
    return `${actor} exported all result reports.`;
  }

  if (action === 'EXPORT_RESULTS_WINNERS') {
    return `${actor} exported winners results.`;
  }

  if (action === 'ADD_NOMINEE') {
    return `${actor} added a nominee.`;
  }

  if (action === 'DELETE_NOMINEE') {
    return `${actor} deleted a nominee.`;
  }

  if (parsed?.note) {
    return parsed.note;
  }

  return `${actor} performed ${String(row.action || '')
    .replace(/_/g, ' ')
    .toLowerCase()}.`;
}

function buildMetaLines(parsed: ParsedMessage | null) {
  if (!parsed) return [];

  const lines: Array<{ label: string; value: string }> = [];

  if (parsed.body && Object.keys(parsed.body).length) {
    lines.push({
      label: 'Body',
      value: JSON.stringify(parsed.body),
    });
  }

  if (parsed.responseSummary && Object.keys(parsed.responseSummary).length) {
    lines.push({
      label: 'Response',
      value: JSON.stringify(parsed.responseSummary),
    });
  }

  if (parsed.error) {
    lines.push({
      label: 'Error',
      value: parsed.error,
    });
  }

  return lines;
}

function DetailsCell({ row }: { row: AuditRow }) {
  const parsed = tryParseMessage(row.message);
  const meta = buildMetaLines(parsed);

  return (
    <div className="max-w-[420px] space-y-2">
      <p className="text-sm font-semibold leading-6 text-slate-900">
        {buildDetailsText(row, parsed)}
      </p>

      {meta.length ? (
        <div className="space-y-1 text-xs text-slate-500">
          {meta.map((item) => (
            <p key={`${row.auditId}-${item.label}`}>
              <span className="font-semibold text-slate-700">{item.label}:</span>{' '}
              {item.value}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function exportButtonClass() {
  return 'inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50';
}

function normalizeActionFilter(value: string) {
  return value.trim().replace(/\s+/g, '_');
}

function AuditMobileCard({ row }: { row: AuditRow }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{row.adminUsername || '—'}</p>
          <p className="mt-1 text-xs text-slate-500">{fmtDate(row.createdAt)}</p>
        </div>

        <Pill
          text={row.status || 'UNKNOWN'}
          className={statusBadge(row.status)}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Pill
          text={row.module || 'UNKNOWN'}
          className={moduleBadge(row.module)}
        />
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
          {formatTarget(row.module, row.target)}
        </span>
      </div>

      <div className="mt-4">
        <DetailsCell row={row} />
      </div>
    </div>
  );
}

export default function AuditClient() {
  const [limit, setLimit] = useState('50');
  const [admin, setAdmin] = useState('');
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();

    if (limit.trim()) p.set('limit', limit.trim());
    if (admin.trim()) p.set('admin', admin.trim());

    const normalizedAction = normalizeActionFilter(action);
    if (normalizedAction) p.set('action', normalizedAction);

    const qs = p.toString();
    return qs ? `?${qs}` : '';
  }, [limit, admin, action]);

 async function load(customQueryString?: string) {
  setLoading(true);
  setError(null);

  try {
    const res = await fetch(`/api/admin/audit${customQueryString ?? queryString}`, {
      method: 'GET', // ✅ added
      cache: 'no-store',
      credentials: 'include',
      headers: {
        Accept: 'application/json', // ✅ added
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Request failed (${res.status})`);
    }

    const data = (await res.json()) as ApiResponse;
    setRows(Array.isArray(data.items) ? data.items : []);
  } catch (e: any) {
    setError(e?.message || 'Failed to load audit logs');
    setRows([]);
  } finally {
    setLoading(false);
  }
}

  function exportLogs(format: 'csv' | 'xlsx' | 'pdf') {
    window.location.href = `/api/admin/audit/export?format=${format}`;
  }

  function handleReset() {
    setLimit('50');
    setAdmin('');
    setAction('');
    load('?limit=50');
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 xl:grid-cols-[160px_220px_260px_auto] xl:items-end">
            <div>
              <label className="block text-sm font-medium text-slate-800">
                Limit
              </label>
              <input
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                placeholder="50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">
                Admin
              </label>
              <input
                value={admin}
                onChange={(e) => setAdmin(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                placeholder="superadmin"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-800">
                Action
              </label>
              <input
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                placeholder="Admin Role Change"
              />
            </div>

            <div className="flex flex-wrap gap-3 xl:justify-start">
              <button
                onClick={() => load()}
                disabled={loading}
                className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading…' : 'Apply Filters'}
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-500">
              {rows.length ? `${rows.length} log(s)` : 'No logs loaded yet'}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => exportLogs('csv')}
                className={exportButtonClass()}
              >
                Export CSV
              </button>

              <button
                type="button"
                onClick={() => exportLogs('xlsx')}
                className={exportButtonClass()}
              >
                Export XLSX
              </button>

              <button
                type="button"
                onClick={() => exportLogs('pdf')}
                className={exportButtonClass()}
              >
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 lg:hidden">
        {!loading && rows.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-sm text-slate-500 shadow-sm">
            No audit logs found.
          </div>
        ) : null}

        {rows.map((row) => (
          <AuditMobileCard key={row.auditId} row={row} />
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:block">
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                {['Time', 'Admin', 'Module', 'Target', 'Status', 'Details'].map(
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
              {!loading && rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-sm text-slate-500"
                  >
                    No audit logs found.
                  </td>
                </tr>
              ) : null}

              {rows.map((r) => (
                <tr key={r.auditId} className="align-top">
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                    {fmtDate(r.createdAt)}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900">
                    {r.adminUsername || '—'}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm">
                    <Pill
                      text={r.module || 'UNKNOWN'}
                      className={moduleBadge(r.module)}
                    />
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                    {formatTarget(r.module, r.target)}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4 text-sm">
                    {r.status ? (
                      <Pill text={r.status} className={statusBadge(r.status)} />
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  <td className="border-b border-slate-100 px-4 py-4">
                    <DetailsCell row={r} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
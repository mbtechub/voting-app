'use client';

import { useEffect, useMemo, useState } from 'react';

type WebhookEventRow = {
  webhookEventId: number;
  provider: string | null;
  route: string | null;
  ipAddress: string | null;
  eventName: string | null;
  reference: string | null;
  signaturePresent: 'Y' | 'N';
  signatureValid: 'Y' | 'N';
  processed: 'Y' | 'N';
  processResult: string | null;
  errorMessage: string | null;
  requestHash: string;
  receivedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  paymentId: number | null;
  cartId: number | null;
};

type ApiResponse = {
  count: number;
  items: WebhookEventRow[];
};

function fmtDate(s?: string | null) {
  if (!s) return '';
  try {
    return new Date(s).toLocaleString();
  } catch {
    return s;
  }
}

function badgeClass(ok?: boolean) {
  if (ok === undefined) {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }
  return ok
    ? 'border-green-200 bg-green-100 text-green-700'
    : 'border-red-200 bg-red-100 text-red-700';
}

function resultBadgeClass(value?: string | null) {
  const v = String(value || '').toUpperCase();

  if (v.includes('SUCCESS') || v.includes('PROCESSED') || v.includes('OK')) {
    return 'border-green-200 bg-green-100 text-green-700';
  }

  if (v.includes('FAILED') || v.includes('ERROR') || v.includes('INVALID')) {
    return 'border-red-200 bg-red-100 text-red-700';
  }

  if (v.includes('PARTIAL')) {
    return 'border-amber-200 bg-amber-100 text-amber-700';
  }

  return 'border-slate-200 bg-slate-100 text-slate-700';
}

function Pill({ text, className }: { text: string; className: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
      {text}
    </span>
  );
}

export default function WebhooksClient() {
  const [limit, setLimit] = useState('50');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<WebhookEventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    const l = (limit || '').trim();
    const r = (reference || '').trim();

    if (l) p.set('limit', l);
    if (r) p.set('reference', r);

    const qs = p.toString();
    return qs ? `?${qs}` : '';
  }, [limit, reference]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/webhooks/recent${queryString}`, {
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
      setError(e?.message || 'Failed to load webhook events');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid gap-4 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-end">
            <div>
              <label className="block text-sm font-medium text-slate-800">
                Limit
              </label>
              <input
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 sm:w-40"
                placeholder="50"
              />
              <p className="mt-1 text-xs text-slate-500">Maximum 200 rows</p>
            </div>

            <div className="sm:col-span-2 lg:min-w-[320px]">
              <label className="block text-sm font-medium text-slate-800">
                Reference
              </label>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                placeholder="VOTE_..."
              />
              <p className="mt-1 text-xs text-slate-500">
                Optional Paystack or internal payment reference
              </p>
            </div>

            <button
              onClick={load}
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Reload'}
            </button>
          </div>

          <div className="text-sm text-slate-500">
            {rows.length ? `${rows.length} event(s)` : ''}
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                {[
                  'ID',
                  'Received',
                  'Event',
                  'Reference',
                  'Signature',
                  'Processed',
                  'Result',
                  'Duration',
                  'Error',
                ].map((h) => (
                  <th
                    key={h}
                    className="whitespace-nowrap border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {!loading && rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-6 text-sm text-slate-500"
                  >
                    No webhook events found.
                  </td>
                </tr>
              )}

              {rows.map((r) => {
                const sigPresent = r.signaturePresent === 'Y';
                const sigOk = r.signatureValid === 'Y';
                const processedOk = r.processed === 'Y';
                const duration =
                  r.durationMs == null ? '' : `${r.durationMs}ms`;

                let signatureText = 'NOT PRESENT';
                let signatureClass = badgeClass(undefined);

                if (sigPresent) {
                  signatureText = sigOk ? 'VALID' : 'INVALID';
                  signatureClass = badgeClass(sigOk);
                }

                return (
                  <tr key={r.webhookEventId}>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {r.webhookEventId}
                    </td>

                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {fmtDate(r.receivedAt)}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      <div className="font-semibold text-slate-900">
                        {r.eventName || '-'}
                      </div>
                      {(r.provider || r.route) && (
                        <div className="mt-1 text-xs text-slate-500">
                          {[r.provider, r.route].filter(Boolean).join(' • ')}
                        </div>
                      )}
                    </td>

                    <td className="whitespace-nowrap border-b border-slate-100 px-4 py-4 font-mono text-xs text-slate-700">
                      {r.reference || ''}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      <Pill text={signatureText} className={signatureClass} />
                    </td>

                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      <Pill
                        text={processedOk ? 'YES' : 'NO'}
                        className={badgeClass(processedOk)}
                      />
                    </td>

                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {r.processResult ? (
                        <Pill
                          text={r.processResult}
                          className={resultBadgeClass(r.processResult)}
                        />
                      ) : (
                        ''
                      )}
                    </td>

                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {duration}
                    </td>

                    <td
                      className={`max-w-[420px] truncate border-b border-slate-100 px-4 py-4 text-sm ${
                        r.errorMessage ? 'text-red-700' : 'text-slate-500'
                      }`}
                      title={r.errorMessage || ''}
                    >
                      {r.errorMessage || ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
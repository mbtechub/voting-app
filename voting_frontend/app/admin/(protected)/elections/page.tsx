import React from 'react';
import { cookies, headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  electionId: number;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  revenue: number;
  votesSold: number;
};

function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatMoney(n: number) {
  return `₦${Number(n || 0).toLocaleString()}`;
}

function statusBadgeClass(status: string) {
  const s = String(status || '').toUpperCase();

  if (s === 'ACTIVE') {
    return 'border-green-200 bg-green-100 text-green-700';
  }
  if (s === 'ENDED') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }
  if (s === 'DRAFT') {
    return 'border-amber-200 bg-amber-100 text-amber-700';
  }
  if (s === 'DISABLED') {
    return 'border-red-200 bg-red-100 text-red-700';
  }

  return 'border-gray-200 bg-gray-100 text-gray-700';
}

async function getOriginFromHeaders() {
  const h = await headers();
  const proto = h.get('x-forwarded-proto') || 'http';
  const host = h.get('x-forwarded-host') || h.get('host') || '127.0.0.1:3001';
  return `${proto}://${host}`;
}

async function fetchFinancials(): Promise<Row[]> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const origin = await getOriginFromHeaders();

  const res = await fetch(`${origin}/api/admin/elections/financials`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Cookie: cookieHeader,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const text = await res.text();
    let msg = `Failed (${res.status})`;
    try {
      const data = JSON.parse(text);
      msg = data?.message || msg;
    } catch {}
    throw new Error(msg);
  }

  return res.json();
}

export default async function AdminElectionsPage() {
  const rows = await fetchFinancials();

  const totalRevenue = rows.reduce((sum, r) => sum + Number(r.revenue || 0), 0);
  const totalVotes = rows.reduce((sum, r) => sum + Number(r.votesSold || 0), 0);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Poll Financials
        </div>

        <h1 className="mt-4 text-3xl font-bold">
          Poll Financial Overview
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Review aggregated financial performance, revenue totals, and vote
          volume across polls.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Total Revenue
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {formatMoney(totalRevenue)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
            Total Votes Sold
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {totalVotes.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Title
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Status
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Start
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  End
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Revenue
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Votes Sold
                </th>
              </tr>
            </thead>

            <tbody>
              {rows.length ? (
                rows.map((r) => (
                  <tr key={r.electionId}>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900">
                      {r.title}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(
                          r.status,
                        )}`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {formatDate(r.startDate)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {formatDate(r.endDate)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {formatMoney(r.revenue)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {Number(r.votesSold || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                    No polls found.
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
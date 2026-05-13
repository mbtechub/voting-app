import React from 'react';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = {
  electionId: number;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  defaultVotePrice: number | null;
};

async function fetchElections(searchParams: {
  status?: string;
  q?: string;
}): Promise<Row[]> {
  const qs = new URLSearchParams();
  if (searchParams.status) qs.set('status', searchParams.status);
  if (searchParams.q) qs.set('q', searchParams.q);

  const h = await headers();
  const origin =
    h.get('x-forwarded-proto') && h.get('x-forwarded-host')
      ? `${h.get('x-forwarded-proto')}://${h.get('x-forwarded-host')}`
      : h.get('origin') || '';

  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const res = await fetch(
    `${origin}/api/admin/elections?${qs.toString()}`,
    {
      method: 'GET',
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    },
  );

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

function formatDate(d: string) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });
}

function formatPrice(value: number | null) {
  if (value == null) return '-';
  return `₦${Number(value).toLocaleString()}`;
}

function getStatusBadgeClass(status: string) {
  const s = String(status || '').toUpperCase();

  if (s === 'ACTIVE') return 'bg-green-100 text-green-700';
  if (s === 'DRAFT') return 'bg-slate-100 text-slate-700';
  if (s === 'ENDED') return 'bg-amber-100 text-amber-700';

  return 'bg-gray-100 text-gray-700';
}

export default async function ElectionsCrudPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;

  let rows: Row[] = [];

  try {
    rows = await fetchElections(params);
  } catch (err) {
    console.error('Elections fetch failed:', err);
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm backdrop-blur">
              Poll Management
            </div>

            <h1 className="mt-4 text-3xl font-bold">Manage Polls</h1>

            <p className="mt-2 text-sm text-blue-100">
              Create, update, manage polls with a clean workflow.
            </p>
          </div>

          <Link
            href="/admin/elections-crud/new"
            className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            + New Poll
          </Link>
        </div>
      </div>

      {/* FILTER */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
          action="/admin/elections-crud"
          method="get"
        >
          <input
            name="q"
            defaultValue={params.q || ''}
            placeholder="Search title..."
            className="w-full lg:max-w-sm rounded-2xl border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100"
          />

          <select
            name="status"
            defaultValue={params.status || ''}
            className="w-full lg:max-w-xs rounded-2xl border px-4 py-3 text-sm"
          >
            <option value="">All</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="ENDED">ENDED</option>
          </select>

          <div className="flex gap-2">
            <button className="rounded-2xl bg-blue-600 px-5 py-3 text-sm text-white">
              Filter
            </button>

            <Link
              href="/admin/elections-crud"
              className="rounded-2xl border px-5 py-3 text-sm"
            >
              Reset
            </Link>
          </div>
        </form>
      </div>

      {/* TABLE */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Title
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Start
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  End
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
  {rows.length ? (
    rows.map((r) => (
      <tr
        key={r.electionId}
        className="group transition hover:bg-slate-50/70"
      >

        {/* TITLE */}
        <td className="border-b border-slate-100 px-4 py-4 w-[38%] min-w-[280px] max-w-[420px]">

          <div className="flex min-w-0 items-center gap-3">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-semibold text-slate-600">
              {r.title?.charAt(0)}
            </div>

            <div className="min-w-0 flex-1">

              <p className="truncate text-sm font-semibold text-slate-900">
                {r.title}
              </p>

              <p className="truncate text-xs text-slate-500">
                Poll item
              </p>

            </div>

          </div>

        </td>

        {/* STATUS */}
        <td className="border-b border-slate-100 px-4 py-4 whitespace-nowrap">

          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
              r.status,
            )}`}
          >
            {r.status}
          </span>

        </td>

        {/* START */}
        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
          {formatDate(r.startDate)}
        </td>

        {/* END */}
        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700 whitespace-nowrap">
          {formatDate(r.endDate)}
        </td>

        {/* PRICE */}
        <td className="border-b border-slate-100 px-4 py-4 whitespace-nowrap">

          <span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            {formatPrice(r.defaultVotePrice)}
          </span>

        </td>

        {/* ACTIONS */}
        <td className="border-b border-slate-100 px-4 py-4 text-right whitespace-nowrap min-w-[130px]">

          <div className="flex items-center justify-end gap-2">

            <Link
              href={`/admin/elections-crud/${r.electionId}`}
              className="min-w-[80px] shrink-0 rounded-xl border border-slate-200 bg-white px-4 py-2 text-center text-xs font-medium text-slate-700 transition hover:bg-slate-100"
            >
              Edit
            </Link>

          </div>

        </td>

      </tr>
    ))
  ) : (
    <tr>
      <td
        colSpan={6}
        className="px-4 py-12 text-center text-sm text-slate-500"
      >
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
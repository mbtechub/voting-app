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
      headers: {
        Cookie: cookieHeader,
      },
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
  if (s === 'DISABLED') return 'bg-red-100 text-red-700';

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
              Create, update, disable polls, and manage nominees.
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
          <div className="w-full lg:max-w-sm">
            <label className="text-sm font-medium text-slate-800">
              Search Title
            </label>
            <input
              name="q"
              defaultValue={params.q || ''}
              placeholder="Search title..."
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <div className="w-full lg:max-w-xs">
            <label className="text-sm font-medium text-slate-800">
              Status
            </label>
            <select
              name="status"
              defaultValue={params.status || ''}
              className="mt-2 w-full rounded-2xl border px-4 py-3 text-sm"
            >
              <option value="">All</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ENDED">ENDED</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>

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

      {/* MODERN LIST (REPLACES TABLE) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-3">
          {rows.length ? (
            rows.map((r) => (
              <div
                key={r.electionId}
                className="group flex items-center justify-between rounded-2xl border border-slate-100 p-4 transition hover:shadow-md"
              >
                {/* LEFT */}
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 font-semibold text-slate-600">
                    {r.title?.charAt(0)}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {r.title}
                    </p>

                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${getStatusBadgeClass(
                        r.status,
                      )}`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>

                {/* CENTER */}
                <div className="hidden md:flex items-center gap-10 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Price</p>
                    <p className="font-semibold">
                      {formatPrice(r.defaultVotePrice)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Start</p>
                    <p>{formatDate(r.startDate)}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">End</p>
                    <p>{formatDate(r.endDate)}</p>
                  </div>
                </div>

                {/* ACTIONS */}
                <div className="flex items-center gap-2 opacity-0 transition group-hover:opacity-100">
                  <Link
                    href={`/admin/elections-crud/${r.electionId}`}
                    className="rounded-xl border px-3 py-1.5 text-xs hover:bg-slate-50"
                  >
                    Edit
                  </Link>

                  <button className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50">
                    Delete
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-sm text-slate-500">
              No polls found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
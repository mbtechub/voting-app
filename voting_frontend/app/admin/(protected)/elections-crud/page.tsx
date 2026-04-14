import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';

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
  const cookieStore = await cookies();

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_BASE_URL is not defined');
  }

  const qs = new URLSearchParams();
  if (searchParams.status) qs.set('status', searchParams.status);
  if (searchParams.q) qs.set('q', searchParams.q);

  const res = await fetch(
    `${baseUrl}/api/admin/elections?${qs.toString()}`, // ✅ ABSOLUTE + PROXY
    {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Cookie: cookieStore.toString(), // ✅ REQUIRED FOR AUTH
        Accept: 'application/json',
      },
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

  if (s === 'ACTIVE') {
    return 'border-green-200 bg-green-100 text-green-700';
  }
  if (s === 'DRAFT') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }
  if (s === 'ENDED') {
    return 'border-amber-200 bg-amber-100 text-amber-700';
  }
  if (s === 'DISABLED') {
    return 'border-red-200 bg-red-100 text-red-700';
  }

  return 'border-gray-200 bg-gray-100 text-gray-700';
}

export default async function ElectionsCrudPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const params = await searchParams;

  const rows = await fetchElections(params);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
              Poll Management
            </div>

            <h1 className="mt-4 text-3xl font-bold">Manage Polls</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
              Create, update, disable polls, and manage nominees with a clean
              administrative workflow.
            </p>
          </div>

          <div>
            <Link
              href="/admin/elections-crud/new"
              className="inline-flex items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              New Poll
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form
          className="flex flex-col gap-3 lg:flex-row lg:items-end"
          action="/admin/elections-crud"
          method="get"
        >
          <div className="w-full lg:max-w-sm">
            <label className="block text-sm font-medium text-slate-800">
              Search Title
            </label>
            <input
              name="q"
              defaultValue={params.q || ''}
              placeholder="Search title..."
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="w-full lg:max-w-xs">
            <label className="block text-sm font-medium text-slate-800">
              Status
            </label>
            <select
              name="status"
              defaultValue={params.status || ''}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All statuses</option>
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="ENDED">ENDED</option>
              <option value="DISABLED">DISABLED</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Filter
            </button>

            <Link
              href="/admin/elections-crud"
              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Reset
            </Link>
          </div>
        </form>
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
                  Default Price
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-right text-sm font-semibold text-slate-700">
                  Action
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
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
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
                      {formatPrice(r.defaultVotePrice)}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-right text-sm">
                      <Link
                        href={`/admin/elections-crud/${r.electionId}`}
                        className="font-semibold text-blue-700 transition hover:text-blue-800 hover:underline"
                      >
                        Manage
                      </Link>
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
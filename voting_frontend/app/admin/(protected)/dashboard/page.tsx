'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { normalizeRole, type AppRole } from '@/lib/auth/role';

type DashboardSummary = {
  revenue: { total: number };
  payments: { byStatus: Array<{ status: string; count: number }> };
  elections: { total: number; active: number; ended: number };
  dailyRevenue: Array<{ day: any; total: number }>;
};

type Revenue30Row = { day: any; total: number };

type TopElectionRow = {
  electionId: number;
  electionTitle: string;
  revenue: number;
  votesSold: number;
};

type TopCandidateRow = {
  electionId: number;
  electionTitle: string;
  candidateId: number;
  candidateName: string;
  voteCount: number;
};

type PaymentsHealthApi = {
  pendingCarts: number;
  payments: { initiated: number; success: number; partial: number; failed: number };
  last24h: { success: number; failed: number };
  last7d: { success: number; failed: number };
};

type WhoAmIStable = {
  ok: boolean;
  role: AppRole;
  admin: null | {
    adminId?: number;
    email?: string;
    username?: string;
    isActive?: boolean;
  };
  message?: string;
};

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {title}
      </div>
      <div className="mt-3 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

function formatDayLabel(d: any) {
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

function formatNaira(n: number) {
  return `₦${Number(n ?? 0).toLocaleString()}`;
}

function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="text-base font-bold text-slate-900">{title}</span>
        <span className="text-sm text-slate-500">{open ? '▾' : '▸'}</span>
      </button>

      {open ? (
        <div className="border-t border-slate-200 px-5 py-5">{children}</div>
      ) : (
        <div className="border-t border-slate-200 px-5 py-4 text-sm text-slate-500">
          Collapsed
        </div>
      )}
    </section>
  );
}

async function safeJson(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function isCandidateRows(x: any): x is TopCandidateRow[] {
  return (
    Array.isArray(x) &&
    (x.length === 0 ||
      ('candidateId' in x[0] && 'candidateName' in x[0] && 'voteCount' in x[0]))
  );
}

function isTopElectionRows(x: any): x is TopElectionRow[] {
  return (
    Array.isArray(x) &&
    (x.length === 0 ||
      ('electionId' in x[0] &&
        'electionTitle' in x[0] &&
        'votesSold' in x[0] &&
        'revenue' in x[0]))
  );
}

function aggregateElectionFromCandidates(rows: TopCandidateRow[]): TopElectionRow[] {
  const map = new Map<number, TopElectionRow>();

  for (const r of rows) {
    const curr = map.get(r.electionId);
    if (!curr) {
      map.set(r.electionId, {
        electionId: r.electionId,
        electionTitle: r.electionTitle,
        revenue: 0,
        votesSold: Number(r.voteCount ?? 0),
      });
    } else {
      curr.votesSold += Number(r.voteCount ?? 0);
    }
  }

  return Array.from(map.values()).sort((a, b) => b.votesSold - a.votesSold);
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
      {message}
    </div>
  );
}

function DataTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function TableCell({
  children,
  className = '',
  colSpan,
}: {
  children: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      className={`border-b border-slate-100 px-4 py-3 align-top text-sm text-slate-700 ${className}`}
    >
      {children}
    </td>
  );
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [role, setRole] = useState<AppRole>('UNKNOWN');
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleError, setRoleError] = useState<string | null>(null);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue30, setRevenue30] = useState<Revenue30Row[]>([]);
  const [topElections, setTopElections] = useState<TopElectionRow[]>([]);
  const [topCandidates, setTopCandidates] = useState<TopCandidateRow[]>([]);
  const [paymentsHealth, setPaymentsHealth] = useState<PaymentsHealthApi | null>(null);

  const [topElectionsErr, setTopElectionsErr] = useState<string | null>(null);
  const [topCandidatesErr, setTopCandidatesErr] = useState<string | null>(null);
  const [healthErr, setHealthErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set(['overview']),
  );

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function checkRole() {
    setRoleLoading(true);
    setRoleError(null);

    try {
      const res = await fetch('/api/admin/auth/whoami', {
        cache: 'no-store',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        router.replace('/admin/login');
        return;
      }

      const who = (await res.json().catch(() => null)) as WhoAmIStable | null;
      const normalized = normalizeRole(who?.role);
      setRole(normalized);

      if (normalized !== 'SUPER_ADMIN') {
        router.replace('/admin/home');
        return;
      }
    } catch (e: any) {
      setRole('UNKNOWN');
      setRoleError(e?.message || 'Failed to check role (whoami).');
    } finally {
      setRoleLoading(false);
    }
  }

  useEffect(() => {
    checkRole();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadAll() {
    if (role !== 'SUPER_ADMIN') return;

    setLoading(true);
    setError(null);
    setTopElectionsErr(null);
    setTopCandidatesErr(null);
    setHealthErr(null);

    try {
      const [summaryRes, revenueRes, topElectionsRes, topCandidatesRes, healthRes] =
        await Promise.all([
          fetch('/api/admin/dashboard/summary', {
            cache: 'no-store',
            credentials: 'include',
          }),
          fetch('/api/admin/dashboard/revenue-30d', {
            cache: 'no-store',
            credentials: 'include',
          }),
          fetch('/api/admin/dashboard/top-elections', {
            cache: 'no-store',
            credentials: 'include',
          }),
          fetch('/api/admin/dashboard/top-candidates', {
            cache: 'no-store',
            credentials: 'include',
          }),
          fetch('/api/admin/dashboard/payments-health', {
            cache: 'no-store',
            credentials: 'include',
          }),
        ]);

      const summaryJson = await safeJson(summaryRes);
      if (!summaryRes.ok) {
        throw new Error(
          (summaryJson as any)?.message || `Summary failed (${summaryRes.status})`,
        );
      }
      setSummary(summaryJson as DashboardSummary);

      const revenueJson = await safeJson(revenueRes);
      if (!revenueRes.ok) {
        throw new Error(
          (revenueJson as any)?.message ||
            `Revenue 30d failed (${revenueRes.status})`,
        );
      }
      setRevenue30(((revenueJson as any) || []) as Revenue30Row[]);

      if (topElectionsRes.ok) {
        const json = await safeJson(topElectionsRes);

        if (isTopElectionRows(json)) {
          const seen = new Set<number>();
          const deduped = (json || []).filter((r) => {
            if (seen.has(r.electionId)) return false;
            seen.add(r.electionId);
            return true;
          });
          setTopElections(deduped);
        } else if (isCandidateRows(json)) {
          setTopElections(aggregateElectionFromCandidates(json));
        } else {
          setTopElections([]);
          setTopElectionsErr('Top Polls returned unexpected data shape.');
        }
      } else {
        const te = await safeJson(topElectionsRes);
        setTopElections([]);
        setTopElectionsErr(
          (te as any)?.message ||
            `Top polls failed (${topElectionsRes.status})`,
        );
      }

      if (topCandidatesRes.ok) {
        const json = await safeJson(topCandidatesRes);

        if (isCandidateRows(json)) {
          const seen = new Set<string>();
          const deduped = (json || []).filter((r) => {
            const k = `eid:${r.electionId}::cid:${r.candidateId}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
          });
          setTopCandidates(deduped);
        } else {
          setTopCandidates([]);
          setTopCandidatesErr('Top Nominees returned unexpected data shape.');
        }
      } else {
        const tc = await safeJson(topCandidatesRes);
        setTopCandidates([]);
        setTopCandidatesErr(
          (tc as any)?.message ||
            `Top nominees failed (${topCandidatesRes.status})`,
        );
      }

      if (healthRes.ok) {
        const json = await safeJson(healthRes);
        setPaymentsHealth(json as PaymentsHealthApi);
      } else {
        const h = await safeJson(healthRes);
        setPaymentsHealth(null);
        setHealthErr(
          (h as any)?.message ||
            `Payments health failed (${healthRes.status})`,
        );
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (role === 'SUPER_ADMIN') loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  useEffect(() => {
    if (!autoRefresh) return;
    if (role !== 'SUPER_ADMIN') return;

    const t = setInterval(() => loadAll(), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, role]);

  const totalRevenue = Number(summary?.revenue?.total ?? 0);
  const paymentsByStatus = summary?.payments?.byStatus ?? [];
  const elections = summary?.elections ?? { total: 0, active: 0, ended: 0 };
  const daily7 = summary?.dailyRevenue ?? [];

  const chartData = useMemo(() => {
    return (revenue30 || []).map((r) => ({
      label: formatDayLabel(r.day),
      total: Number(r.total ?? 0),
    }));
  }, [revenue30]);

  if (roleLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Loading…</h1>
        <p className="mt-2 text-sm text-slate-600">Checking access…</p>
      </div>
    );
  }

  if (roleError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">
          Can’t load dashboard
        </h1>
        <p className="mt-2 text-sm font-semibold text-red-700">{roleError}</p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={checkRole}
            className="rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Retry
          </button>

          <a
            href="/admin/login"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Go to Login →
          </a>
        </div>
      </div>
    );
  }

  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Redirecting…</h1>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Executive Dashboard
        </div>

        <h1 className="mt-4 text-3xl font-bold">Overview</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          High-level metrics for polls, payments, revenue, and nominee activity.
          No per-nominee financial details are shown.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            onClick={loadAll}
            disabled={loading}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-50"
          >
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>

          <label className="flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium backdrop-blur">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh (5s)
          </label>

          {error ? <span className="text-sm text-red-200">{error}</span> : null}
        </div>
      </div>

      <Section
        title="Overview"
        open={openKeys.has('overview')}
        onToggle={() => toggle('overview')}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Revenue (Success + Partial)"
            value={formatNaira(totalRevenue)}
          />
          <StatCard title="Total Polls" value={elections.total} />
          <StatCard title="Active Polls" value={elections.active} />
          <StatCard title="Ended Polls" value={elections.ended} />
        </div>
      </Section>

      <Section
        title="Payments Health"
        open={openKeys.has('health')}
        onToggle={() => toggle('health')}
      >
        {healthErr ? <ErrorBox message={healthErr} /> : null}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <StatCard title="Pending Carts" value={paymentsHealth?.pendingCarts ?? 0} />
          <StatCard title="INITIATED" value={paymentsHealth?.payments?.initiated ?? 0} />
          <StatCard title="SUCCESS" value={paymentsHealth?.payments?.success ?? 0} />
          <StatCard title="PARTIALLY_APPLIED" value={paymentsHealth?.payments?.partial ?? 0} />
          <StatCard title="FAILED" value={paymentsHealth?.payments?.failed ?? 0} />
          <StatCard title="Last 24h SUCCESS" value={paymentsHealth?.last24h?.success ?? 0} />
          <StatCard title="Last 24h FAILED" value={paymentsHealth?.last24h?.failed ?? 0} />
          <StatCard title="Last 7d SUCCESS" value={paymentsHealth?.last7d?.success ?? 0} />
          <StatCard title="Last 7d FAILED" value={paymentsHealth?.last7d?.failed ?? 0} />
        </div>

        <p className="mt-4 text-sm text-slate-500">
          Operational health for carts and payment outcomes across recent periods.
        </p>
      </Section>

      <Section
        title="Revenue (Last 30 days)"
        open={openKeys.has('rev30')}
        onToggle={() => toggle('rev30')}
      >
        <div className="overflow-hidden rounded-2xl border border-slate-200 p-4">
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={4} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: any) => formatNaira(Number(value ?? 0))}
                  labelFormatter={(label) => `Day: ${label}`}
                />
                <Line type="monotone" dataKey="total" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-4 text-sm text-slate-500">
            Daily totals for the last 30 calendar days, including zero-payment days.
          </p>
        </div>
      </Section>

      <Section
        title="Top Polls"
        open={openKeys.has('topElections')}
        onToggle={() => toggle('topElections')}
      >
        {topElectionsErr ? <ErrorBox message={topElectionsErr} /> : null}

        <DataTable headers={['Poll', 'Revenue', 'Votes Sold']}>
          {topElections.length ? (
            topElections.map((r) => (
              <tr key={`eid:${r.electionId}`}>
                <TableCell className="font-semibold text-slate-900">
                  {r.electionTitle}
                </TableCell>
                <TableCell>{formatNaira(Number(r.revenue ?? 0))}</TableCell>
                <TableCell>{Number(r.votesSold ?? 0).toLocaleString()}</TableCell>
              </tr>
            ))
          ) : (
            <tr>
              <TableCell className="text-slate-500" colSpan={3}>
                No data yet
              </TableCell>
            </tr>
          )}
        </DataTable>

        <p className="mt-4 text-sm text-slate-500">
          If backend revenue is not yet available, revenue can show ₦0 while vote totals remain correct.
        </p>
      </Section>

      <Section
        title="Top Nominees (Votes)"
        open={openKeys.has('topCandidates')}
        onToggle={() => toggle('topCandidates')}
      >
        {topCandidatesErr ? <ErrorBox message={topCandidatesErr} /> : null}

        <DataTable headers={['Nominee', 'Poll', 'Votes']}>
          {topCandidates.length ? (
            topCandidates.map((r) => (
              <tr key={`eid:${r.electionId}::cid:${r.candidateId}`}>
                <TableCell className="font-semibold text-slate-900">
                  {r.candidateName}
                </TableCell>
                <TableCell className="font-semibold text-slate-900">
                  {r.electionTitle}
                </TableCell>
                <TableCell>{Number(r.voteCount ?? 0).toLocaleString()}</TableCell>
              </tr>
            ))
          ) : (
            <tr>
              <TableCell className="text-slate-500" colSpan={3}>
                No data yet
              </TableCell>
            </tr>
          )}
        </DataTable>

        <p className="mt-4 text-sm text-slate-500">
          Only vote counts are shown to preserve the no per-nominee financials rule.
        </p>
      </Section>

      <Section
        title="Payments by Status"
        open={openKeys.has('byStatus')}
        onToggle={() => toggle('byStatus')}
      >
        <DataTable headers={['Status', 'Count']}>
          {paymentsByStatus.length ? (
            paymentsByStatus.map((r, idx) => (
              <tr key={`${r.status}-${idx}`}>
                <TableCell>{r.status}</TableCell>
                <TableCell>{Number(r.count).toLocaleString()}</TableCell>
              </tr>
            ))
          ) : (
            <tr>
              <TableCell className="text-slate-500" colSpan={2}>
                No payments yet
              </TableCell>
            </tr>
          )}
        </DataTable>
      </Section>

      <Section
        title="Daily Revenue (Last 7 payment days)"
        open={openKeys.has('daily7')}
        onToggle={() => toggle('daily7')}
      >
        <DataTable headers={['Day', 'Total']}>
          {daily7.length ? (
            daily7.map((d, idx) => (
              <tr key={`${String(d.day)}-${idx}`}>
                <TableCell>{String(d.day)}</TableCell>
                <TableCell>{formatNaira(Number(d.total ?? 0))}</TableCell>
              </tr>
            ))
          ) : (
            <tr>
              <TableCell className="text-slate-500" colSpan={2}>
                No daily revenue yet
              </TableCell>
            </tr>
          )}
        </DataTable>

        <p className="mt-4 text-sm text-slate-500">
          Summary returns the last 7 payment days, while the chart above shows the last 30 calendar days.
        </p>
      </Section>
    </div>
  );
}
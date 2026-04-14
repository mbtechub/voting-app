'use client';

import { useEffect, useState } from 'react';

type DashboardSummary = {
  revenue: { total: number };
  payments: { byStatus: Array<{ status: string; count: number }> };
  elections: { total: number; active: number; ended: number };
  dailyRevenue: Array<{ day: any; total: number }>;
};

type Revenue30Row = { day: any; total: number };

function formatNaira(n: number) {
  return `₦${Number(n ?? 0).toLocaleString()}`;
}

export default function AdminRevenuePage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [revenue30, setRevenue30] = useState<Revenue30Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const [summaryRes, revenueRes] = await Promise.all([
        fetch('/api/admin/dashboard/summary', {
          cache: 'no-store',
          credentials: 'include',
        }),
        fetch('/api/admin/dashboard/revenue-30d', {
          cache: 'no-store',
          credentials: 'include',
        }),
      ]);

      const summaryJson = await summaryRes.json().catch(() => ({}));
      if (!summaryRes.ok) {
        throw new Error(summaryJson?.message || `Summary failed (${summaryRes.status})`);
      }

      const revenueJson = await revenueRes.json().catch(() => []);
      if (!revenueRes.ok) {
        throw new Error(revenueJson?.message || `Revenue 30d failed (${revenueRes.status})`);
      }

      setSummary(summaryJson as DashboardSummary);
      setRevenue30((revenueJson as Revenue30Row[]) || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load revenue');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalRevenue = Number(summary?.revenue?.total ?? 0);
  const breakdown = summary?.payments?.byStatus ?? [];
  const daily7 = summary?.dailyRevenue ?? [];

  return (
    <div style={{ padding: 32 }}>
      <h1 style={{ fontSize: 24, fontWeight: 800 }}>Revenue</h1>

      <div style={{ marginTop: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={load} disabled={loading} style={{ padding: '10px 12px' }}>
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
        {error && <span style={{ color: 'red' }}>{error}</span>}
      </div>

      {/* Total Revenue */}
      <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 10, minWidth: 260 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            Total Revenue (SUCCESS + PARTIALLY_APPLIED)
          </div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>{formatNaira(totalRevenue)}</div>
        </div>

        <div style={{ border: '1px solid #ddd', padding: 16, borderRadius: 10, minWidth: 260 }}>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Payment Status</div>
          <div style={{ marginTop: 8 }}>
            {breakdown.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {breakdown.map((s) => (
                  <li key={s.status}>
                    {s.status}: {Number(s.count).toLocaleString()}
                  </li>
                ))}
              </ul>
            ) : (
              <div>No payments yet</div>
            )}
          </div>
        </div>
      </div>

      {/* Daily revenue (last 7 payment days from summary) */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800 }}>Daily Revenue (Last 7 payment days)</h2>

        <div
          style={{
            marginTop: 10,
            border: '1px solid #ddd',
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>
                  Day
                </th>
                <th style={{ textAlign: 'left', padding: 12, borderBottom: '1px solid #eee' }}>
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {daily7.length ? (
                daily7.map((r, idx) => (
                  <tr key={idx}>
                    <td style={{ padding: 12, borderBottom: '1px solid #f2f2f2' }}>
                      {String(r.day)}
                    </td>
                    <td style={{ padding: 12, borderBottom: '1px solid #f2f2f2' }}>
                      {formatNaira(Number(r.total ?? 0))}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td style={{ padding: 12 }} colSpan={2}>
                    No data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
          30-day points available: {revenue30.length}
        </p>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

type Row = { day: string | Date; total: number };

function toLabel(d: string | Date) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });
}

export default function Revenue30DaysChart() {
  const [data, setData] = useState<Array<{ label: string; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch('/api/admin/dashboard/revenue-30-days', {
          method: 'GET', // ✅ added
          cache: 'no-store',
          credentials: 'include', // ✅ FIXED (IMPORTANT)
          headers: {
            Accept: 'application/json', // ✅ FIXED
          },
        });

        if (!res.ok) {
          const txt = await res.text().catch(() => '');
          throw new Error(`HTTP ${res.status} ${txt}`.trim());
        }

        const rows: Row[] = await res.json();

        const mapped = (rows || []).map((r) => ({
          label: toLabel(r.day),
          total: Number(r.total ?? 0),
        }));

        if (alive) setData(mapped);
      } catch (e: any) {
        if (alive) setError(e?.message ?? 'Failed to load chart data');
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const max = useMemo(() => {
    return data.reduce((m, x) => (x.total > m ? x.total : m), 0);
  }, [data]);

  if (loading)
    return <div className="text-sm text-muted-foreground">Loading revenue chart…</div>;

  if (error)
    return <div className="text-sm text-red-600">Revenue chart error: {error}</div>;

  if (!data.length)
    return <div className="text-sm text-muted-foreground">No data.</div>;

  return (
    <div className="rounded-2xl border p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <div className="text-base font-semibold">Revenue (Last 30 Days)</div>
          <div className="text-xs text-muted-foreground">
            Daily totals (0 on no-payment days)
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          Max: {max.toLocaleString()}
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} interval={4} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line type="monotone" dataKey="total" dot={false} strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
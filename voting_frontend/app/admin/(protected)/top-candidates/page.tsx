'use client';

import { useEffect, useState } from 'react';

type Candidate = {
  electionId: number;
  electionTitle: string;
  candidateId: number;
  candidateName: string;
  voteCount: number;
};

export default function TopCandidatesPage() {
  const [data, setData] = useState<Candidate[]>([]);
  const [limit, setLimit] = useState(10);
  const [electionId, setElectionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      if (electionId.trim()) {
        params.set('electionId', electionId.trim());
      }

      const res = await fetch(
        `/api/admin/dashboard/top-candidates?${params.toString()}`,
        {
          method: 'GET', // ✅ added
          cache: 'no-store',
          credentials: 'include', // ✅ FIXED
          headers: {
            Accept: 'application/json', // ✅ FIXED
          },
        },
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch');
      }

      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err: any) {
      setError(err?.message || 'Error loading data');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Top Candidates
        </div>

        <h1 className="mt-4 text-3xl font-bold">Candidates Leaderboard</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Review the highest-performing candidates by vote count across elections
          or narrow the leaderboard to a specific election.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          <div className="w-full lg:max-w-xs">
            <label className="block text-sm font-medium text-slate-800">
              Election ID (optional)
            </label>
            <input
              type="number"
              placeholder="Election ID"
              value={electionId}
              onChange={(e) => setElectionId(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="w-full lg:max-w-xs">
            <label className="block text-sm font-medium text-slate-800">
              Limit
            </label>
            <input
              type="number"
              placeholder="Limit"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={load}
            disabled={loading}
            className="rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading…' : 'Load'}
          </button>
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
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Rank
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Candidate
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Election
                </th>
                <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                  Votes
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading && data.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-sm text-slate-500">
                    No leaderboard data found.
                  </td>
                </tr>
              ) : (
                data.map((c, index) => (
                  <tr key={`${c.electionId}-${c.candidateId}`}>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900">
                      {index + 1}
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {c.candidateName}
                      </span>{' '}
                      <span className="text-slate-500">(#{c.candidateId})</span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {c.electionTitle}
                      </span>{' '}
                      <span className="text-slate-500">(#{c.electionId})</span>
                    </td>
                    <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                      {Number(c.voteCount ?? 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
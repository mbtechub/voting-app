'use client';

import { useEffect, useMemo, useState } from 'react';

type ElectionRow = {
  electionId: number;
  title: string;
};

type ResultRow = {
  candidateId?: number;
  candidateName?: string;
  name?: string;
  voteCount?: number;
  vote_count?: number;
};

function getStatusButtonClass(disabled?: boolean) {
  return `rounded-2xl px-5 py-3 text-sm font-semibold transition ${
    disabled
      ? 'cursor-not-allowed bg-slate-200 text-slate-500'
      : 'bg-blue-600 text-white hover:bg-blue-700'
  }`;
}

function getExportLinkClass(disabled?: boolean) {
  return `inline-flex items-center justify-center rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
    disabled
      ? 'pointer-events-none border-slate-200 bg-slate-100 text-slate-400'
      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
  }`;
}

export default function AdminResultsPage() {
  const [elections, setElections] = useState<ElectionRow[]>([]);
  const [electionId, setElectionId] = useState<number | null>(null);

  const [results, setResults] = useState<ResultRow[]>([]);
  const [loadingElections, setLoadingElections] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const selectedElectionId = useMemo(() => electionId, [electionId]);

  /* ================= LOAD ELECTIONS ================= */

  useEffect(() => {
    let cancelled = false;
    setLoadingElections(true);

    fetch('/api/admin/elections/financials', {
      method: 'GET',
      cache: 'no-store',
      credentials: 'include', // ✅ FIXED
      headers: {
        Accept: 'application/json', // ✅ FIXED
      },
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);
        return data;
      })
      .then((rows: any[]) => {
        if (cancelled) return;
        const list = (rows || []).map((r) => ({
          electionId: Number(r.electionId),
          title: String(r.title),
        }));
        setElections(list);
        if (list.length && electionId === null) setElectionId(list[0].electionId);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoadingElections(false));

    return () => {
      cancelled = true;
    };
  }, []);

  /* ================= LOAD RESULTS ================= */

  async function loadResults(eid: number) {
    setLoadingResults(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/results?electionId=${eid}`, {
        method: 'GET',
        cache: 'no-store',
        credentials: 'include', // ✅ FIXED
        headers: {
          Accept: 'application/json', // ✅ FIXED
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `Failed (${res.status})`);

      setResults(data?.results ?? []);
    } catch (e: any) {
      setError(e.message || 'Failed to load results');
    } finally {
      setLoadingResults(false);
    }
  }

  useEffect(() => {
    if (!selectedElectionId) return;
    loadResults(selectedElectionId);
  }, [selectedElectionId]);

  /* ================= AUTO REFRESH ================= */

  useEffect(() => {
    if (!autoRefresh || !selectedElectionId) return;

    const interval = setInterval(() => {
      loadResults(selectedElectionId);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, selectedElectionId]);

  /* ================= EXPORT LINKS ================= */

  const exportCsvHref = selectedElectionId
    ? `/api/admin/results/export?electionId=${selectedElectionId}&format=csv`
    : '#';

  const exportXlsxHref = selectedElectionId
    ? `/api/admin/results/export?electionId=${selectedElectionId}&format=xlsx`
    : '#';

  const exportPdfHref = selectedElectionId
    ? `/api/admin/results/export?electionId=${selectedElectionId}&format=pdf`
    : '#';

  const exportAllCsvHref = `/api/admin/results/export-all?format=csv`;
  const exportAllXlsxHref = `/api/admin/results/export-all?format=xlsx`;
  const exportAllPdfHref = `/api/admin/results/export-all?format=pdf`;

  const winnersAllCsvHref = `/api/admin/results/export-winners?format=csv`;
  const winnersAllXlsxHref = `/api/admin/results/export-winners?format=xlsx`;
  const winnersAllPdfHref = `/api/admin/results/export-winners?format=pdf`;

  /* ================= UI ================= */

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Live Results
        </div>

        <h1 className="mt-4 text-3xl font-bold">Poll Results</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Review live poll outcomes, refresh counts, and export results for one
          poll, all polls, or winners only.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
          <div>
            <label className="block text-sm font-medium text-slate-800">
              Select poll
            </label>

            <select
              value={electionId ?? ''}
              onChange={(e) => setElectionId(Number(e.target.value))}
              disabled={loadingElections || !elections.length}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
              {loadingElections && <option>Loading…</option>}

              {!loadingElections &&
                elections.map((e) => (
                  <option key={e.electionId} value={e.electionId}>
                    {e.title} (ID: {e.electionId})
                  </option>
                ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 lg:justify-end">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => selectedElectionId && loadResults(selectedElectionId)}
                disabled={loadingResults || !selectedElectionId}
                className={getStatusButtonClass(
                  loadingResults || !selectedElectionId,
                )}
              >
                {loadingResults ? 'Refreshing…' : 'Refresh'}
              </button>

              <a
                href={exportCsvHref}
                onClick={(e) => {
                  if (!selectedElectionId) e.preventDefault();
                }}
                className={getExportLinkClass(!selectedElectionId)}
              >
                Download CSV
              </a>

              <a
                href={exportXlsxHref}
                onClick={(e) => {
                  if (!selectedElectionId) e.preventDefault();
                }}
                className={getExportLinkClass(!selectedElectionId)}
              >
                Download XLSX
              </a>

              <a
                href={exportPdfHref}
                onClick={(e) => {
                  if (!selectedElectionId) e.preventDefault();
                }}
                className={getExportLinkClass(!selectedElectionId)}
              >
                Download PDF
              </a>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                disabled={!selectedElectionId}
              />
              Auto-refresh (5s)
            </label>
          </div>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        ) : null}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 text-sm text-slate-500">
          {loadingResults ? 'Loading results…' : 'Results'}
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700">
                    Nominee
                  </th>
                  <th className="border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 lg:w-40">
                    Votes
                  </th>
                </tr>
              </thead>
              <tbody>
                {results?.length ? (
                  results.map((r, idx) => {
                    const candidate = r.candidateName || r.name || 'Unknown';
                    const votes = r.voteCount ?? r.vote_count ?? 0;

                    return (
                      <tr key={idx}>
                        <td className="border-b border-slate-100 px-4 py-4 text-sm font-semibold text-slate-900">
                          {candidate}
                        </td>
                        <td className="border-b border-slate-100 px-4 py-4 text-sm text-slate-700">
                          {Number(votes).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-slate-500" colSpan={2}>
                      No results yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Export all poll results
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a href={exportAllCsvHref} className={getExportLinkClass(false)}>
                Export ALL (CSV)
              </a>
              <a href={exportAllXlsxHref} className={getExportLinkClass(false)}>
                Export ALL (XLSX)
              </a>
              <a href={exportAllPdfHref} className={getExportLinkClass(false)}>
                Export ALL (PDF)
              </a>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              Export winners
            </p>

            <p className="mt-1 text-sm text-slate-500">
              One winner per poll.
            </p>

            <div className="mt-4 flex flex-wrap gap-3">
              <a href={winnersAllCsvHref} className={getExportLinkClass(false)}>
                Winners (CSV)
              </a>
              <a href={winnersAllXlsxHref} className={getExportLinkClass(false)}>
                Winners (XLSX)
              </a>
              <a href={winnersAllPdfHref} className={getExportLinkClass(false)}>
                Winners (PDF)
              </a>
            </div>
          </div>
        </div>

        
      </div>
    </div>
  );
}
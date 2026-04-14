'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Election = {
  electionId: number;
  title: string;
};

type Candidate = {
  candidateId: number;
  name: string;
  photoUrl?: string | null; // ✅ ADDED
};

export default function VotePage() {
  const params = useParams();
  const electionId = params?.electionId as string;

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  const [electionTitle, setElectionTitle] = useState<string>('');
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!apiBase || !electionId) return;

    Promise.all([
      fetch(`${apiBase}/api/public/elections`).then(r => r.json()),
      fetch(`${apiBase}/api/public/elections/${electionId}/candidates`).then(r => r.json())
    ])
      .then(([elections, cand]) => {
        const found = elections.find(
          (e: Election) => String(e.electionId) === String(electionId)
        );

        setElectionTitle(found?.title || `Poll #${electionId}`);
        setCandidates(cand || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  }, [apiBase, electionId]);

  return (
    <main className="mx-auto max-w-4xl p-6">

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">
          {electionTitle}
        </h1>

        <Link
          href="/vote"
          className="border px-4 py-2 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          ← Back to polls
        </Link>
      </div>

      {loading && <p>Loading nominees...</p>}

      {!loading && candidates.length === 0 && (
        <p>No nominees found.</p>
      )}

      <div className="space-y-4">
        {candidates.map((c) => (
          <div
            key={c.candidateId}
            className="border rounded-2xl p-4 flex justify-between items-center shadow-sm bg-white dark:bg-gray-900 dark:border-gray-700"
          >
            {/* ✅ LEFT SIDE (IMAGE + NAME) */}
            <div className="flex items-center gap-4">

              {/* ✅ IMAGE FIX */}
              {c.photoUrl ? (
                <img
                  src={c.photoUrl}
                  alt={c.name}
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-500">
                  {c.name?.charAt(0)}
                </div>
              )}

              <strong className="text-base">
                {c.name}
              </strong>
            </div>

            {/* RIGHT SIDE */}
            <div className="flex gap-3 items-center">
              <button className="border w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                -
              </button>
              <span className="min-w-[20px] text-center">0</span>
              <button className="border w-10 h-10 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                +
              </button>
            </div>
          </div>
        ))}
      </div>

    </main>
  );
}
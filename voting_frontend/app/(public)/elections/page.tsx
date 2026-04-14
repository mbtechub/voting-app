'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

type Poll = {
  electionId: number;
  title: string;
  description?: string;
};

type Nominee = {
  candidateId: number;
  name: string;
};

export default function VotePage() {
  const params = useParams();
  const electionId = params?.electionId as string;

  const [poll, setPoll] = useState<Poll | null>(null);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  useEffect(() => {
    if (!apiBase || !electionId) return;

    Promise.all([
      fetch(`${apiBase}/api/public/elections`).then(r => r.json()),
      fetch(`${apiBase}/api/public/elections/${electionId}/candidates`).then(r => r.json()),
    ])
      .then(([polls, cand]) => {

        const found = (polls || []).find(
          (p: any) => String(p.electionId) === String(electionId)
        );

        setPoll(found || null);
        setNominees(Array.isArray(cand) ? cand : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));

  }, [apiBase, electionId]);

  return (
    <main className="mx-auto max-w-4xl p-6">

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">
          {poll?.title || `Poll #${electionId}`}
        </h1>

        <Link
          href="/vote"
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
        >
          ← Back to polls
        </Link>
      </div>

      {loading && <p>Loading nominees...</p>}

      {!loading && nominees.length === 0 && (
        <p>No nominees found.</p>
      )}

      <div className="space-y-4">
        {nominees.map(n => (
          <div
            key={n.candidateId}
            className="rounded-xl border p-4 flex items-center justify-between"
          >
            <strong>{n.name}</strong>

            <div className="flex items-center gap-3">
              <button className="border px-3 py-1 rounded">-</button>
              <span>0</span>
              <button className="border px-3 py-1 rounded">+</button>
            </div>
          </div>
        ))}
      </div>

    </main>
  );
}
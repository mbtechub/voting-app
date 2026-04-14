'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { publicFetch } from '@/lib/public-api';
import VoteClient from './VoteClient';

type Poll = {
  electionId: number;
  title: string;
  description?: string | null;
  status?: string | null;
};

type Nominee = {
  candidateId: number;
  electionId: number; // ✅ FIX ADDED
  name: string;
  photoUrl?: string | null;
};

export const dynamic = 'force-dynamic';

export default function VotePollPage() {
  const params = useParams();
  const electionId = Number(params?.electionId);

  const [poll, setPoll] = useState<Poll | null>(null);
  const [nominees, setNominees] = useState<Nominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!electionId || Number.isNaN(electionId)) {
      setError('Invalid poll id.');
      setLoading(false);
      return;
    }

    async function fetchData() {
      let errors: string[] = [];

      try {
        const polls = await publicFetch<Poll[]>('/api/public/elections');

        const foundPoll =
          polls.find((p) => p.electionId === electionId) ?? null;

        setPoll(foundPoll);
      } catch (e) {
        console.error('Failed to load polls:', e);
        errors.push('Failed to load poll');
      }

      try {
        // 🔥 normalize backend response
        const candidates = await publicFetch<any[]>(
          `/api/public/elections/${electionId}/candidates`
        );

        const normalized: Nominee[] = candidates.map((c) => ({
          candidateId: c.candidateId,
          electionId: electionId, // ✅ FIX ADDED
          name: c.name,
          photoUrl:
            c.photoUrl ??
            c.photo_url ??
            null,
        }));

        setNominees(normalized);
      } catch (e) {
        console.error('Failed to load nominees:', e);
        errors.push('Failed to load nominees');
      }

      if (errors.length) {
        setError(errors.join('. '));
      }

      setLoading(false);
    }

    fetchData();
  }, [electionId]);

  const status = (poll?.status || '').toUpperCase();
  const isActive = !status || status === 'ACTIVE';

  /* -------------------- STATES -------------------- */

  if (loading) {
    return (
      <div className="flex justify-center items-center py-16 text-sm text-gray-500">
        Loading poll...
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border p-4 text-sm text-gray-700 bg-white">
          {error}
        </div>
      </div>
    );
  }

  if (!poll) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="rounded-xl border p-4 text-sm text-gray-700 bg-white">
          Poll not found.
        </div>
      </div>
    );
  }

  /* -------------------- UI -------------------- */

 return (
  <div className="max-w-4xl mx-auto">
    <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-6">

      {/* BACK */}
      <div className="flex">
        <Link
          href="/vote"
          className="inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium hover:bg-gray-50 active:scale-[0.98] transition"
        >
          ← Back
        </Link>
      </div>

      {/* TITLE */}
      <div>
        <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">
          {poll.title}
        </h1>

        {poll.description && (
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            {poll.description}
          </p>
        )}
      </div>

      {/* STATUS */}
      {!isActive && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
          This poll is not active right now.
        </div>
      )}

      {/* NOMINEES SECTION */}
      <div className="space-y-4">
        <div className="text-sm font-semibold text-gray-600">
          Nominees
        </div>

        <VoteClient
          electionId={electionId}
          candidates={nominees}
        />
      </div>

    </div>
  </div>
);
}
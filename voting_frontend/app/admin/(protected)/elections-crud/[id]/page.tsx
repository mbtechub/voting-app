import React from 'react';
import Link from 'next/link';
import { cookies } from 'next/headers';
import ManageElectionClient from './manage-election-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/* ================= TYPES ================= */

type Election = {
  electionId: number;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: string;
  defaultVotePrice: number | null;
};

type Candidate = {
  candidateId: number;
  electionId: number;
  name: string;
  description: string | null;
  photoUrl: string | null;
  votePrice: number | null;
  createdAt: string;
};

/* ================= HELPERS ================= */

function toId(value: unknown) {
  const raw =
    typeof value === 'string'
      ? value
      : Array.isArray(value)
      ? value[0]
      : '';

  const id = Number(String(raw).trim());
  return Number.isFinite(id) && id > 0 ? id : null;
}

/* ================= SAFE FETCH ================= */

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_token')?.value;

    const baseUrl = process.env.BACKEND_BASE_URL;

    if (!baseUrl) {
      console.error('[ManageElectionPage] BACKEND_BASE_URL missing');
      return null;
    }

    const res = await fetch(`${baseUrl}${path}`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const text = await res.text();
      console.error('[ManageElectionPage] API ERROR:', res.status, text);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error('[ManageElectionPage] FETCH ERROR:', err);
    return null;
  }
}

/* ================= PAGE ================= */

export default async function ManageElectionPage({
  params,
}: {
  params: Promise<{ id?: string | string[] }>;
}) {
  const p = await params;
  const id = toId(p?.id);

  /* ❌ INVALID ID */
  if (!id) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/elections-crud"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          ← Back to Polls
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-700">Invalid poll id</h1>
          <p className="mt-2 text-sm text-red-600">
            The requested poll could not be opened.
          </p>
        </div>
      </div>
    );
  }

  /* ================= FETCH DATA ================= */

  const [election, candidates] = await Promise.all([
    fetchJson<Election>(`/api/admin/elections/${id}`),
    fetchJson<Candidate[]>(`/api/admin/elections/${id}/candidates`),
  ]);

  /* ❌ FAIL SAFE (AUTH / SERVER ERROR) */
  if (!election) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/elections-crud"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
        >
          ← Back to Polls
        </Link>

        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-lg font-bold text-red-700">
            Failed to load poll
          </h1>
          <p className="mt-2 text-sm text-red-600">
            You may be unauthorized or the server is unavailable.
          </p>
        </div>
      </div>
    );
  }

  /* ================= PAGE UI ================= */

  return (
    <div className="space-y-6">
      {/* BACK */}
      <Link
        href="/admin/elections-crud"
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-blue-600"
      >
        ← Back
      </Link>

      {/* HEADER */}
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Poll Management
        </div>

        <h1 className="mt-4 text-3xl font-bold">Manage Poll</h1>

        <p className="mt-3 max-w-3xl text-sm leading-6 text-blue-100 sm:text-base">
          Update poll details, set status, and manage nominees from one place.
        </p>
      </div>

      {/* CONTENT */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:p-6">
        <ManageElectionClient
          initialElection={election}
          initialCandidates={candidates || []}
        />
      </div>
    </div>
  );
}
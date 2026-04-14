'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

type CreatePayload = {
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  defaultVotePrice?: number;
  status?: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'DISABLED';
};

function toIsoDateOnly(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export default function NewElectionClient() {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);

    if (loading) return;
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const title = String(fd.get('title') || '').trim();
    const description = String(fd.get('description') || '').trim();

    const startRaw = String(fd.get('startDate') || '').trim();
    const endRaw = String(fd.get('endDate') || '').trim();

    const startIso = toIsoDateOnly(startRaw);
    const endIso = toIsoDateOnly(endRaw);

    const defaultVotePriceRaw = String(fd.get('defaultVotePrice') || '').trim();

    const status = String(fd.get('status') || 'DRAFT')
      .trim()
      .toUpperCase() as CreatePayload['status'];

    // ✅ VALIDATION
    if (!title) {
      setErr('Poll title is required');
      setLoading(false);
      return;
    }

    if (!startIso || !endIso) {
      setErr('Start and end dates are required');
      setLoading(false);
      return;
    }

    if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
      setErr('End date must be after start date');
      setLoading(false);
      return;
    }

    const payload: CreatePayload = {
      title,
      description: description || undefined,
      startDate: startIso,
      endDate: endIso,
      status,
    };

    if (defaultVotePriceRaw) {
      const n = Number(defaultVotePriceRaw);
      if (!Number.isFinite(n) || n < 0) {
        setErr('Default vote price must be a valid number >= 0');
        setLoading(false);
        return;
      }
      payload.defaultVotePrice = n;
    }

    try {
      const res = await fetch('/api/admin/elections', {
        method: 'POST',
        cache: 'no-store',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      if (!res.ok) {
        let message = 'Failed to create poll';

        try {
          const parsed = JSON.parse(text);
          message = parsed?.message || message;
        } catch {
          // 🔥 handles non-JSON (like your WebKit error)
          if (text) message = text;
        }

        throw new Error(message);
      }

      // ✅ SAFE JSON PARSE
      let created: any = null;
      try {
        created = text ? JSON.parse(text) : null;
      } catch {
        throw new Error('Invalid server response');
      }

      const id = created?.electionId;

      if (!id) {
        throw new Error('Missing electionId from server');
      }

      router.push(`/admin/elections-crud/${id}`);
    } catch (e: any) {
      setErr(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* BACK NAV */}
      <button
        onClick={() => router.push('/admin/elections-crud')}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-blue-600"
      >
        ← Back
      </button>

      {/* HEADER */}
      <div className="rounded-[2rem] bg-gradient-to-br from-blue-950 via-slate-900 to-blue-800 p-6 text-white shadow-sm">
        <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur">
          Poll Management
        </div>

        <h1 className="mt-4 text-3xl font-bold">Create Poll</h1>

        <p className="mt-3 max-w-3xl text-sm text-blue-100">
          Set up a new poll and configure its lifecycle before adding nominees.
        </p>
      </div>

      {/* FORM */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={onSubmit} className="space-y-6">
          {err && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {err}
            </div>
          )}

          <div className="grid gap-5">
            <div>
              <label className="text-sm font-medium text-slate-800">
                Poll Title
              </label>
              <input
                name="title"
                required
                disabled={loading}
                placeholder="e.g. Best Campus DJ Poll"
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none disabled:opacity-60"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-800">
                Description (optional)
              </label>
              <textarea
                name="description"
                rows={4}
                disabled={loading}
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100 outline-none disabled:opacity-60"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-800">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  required
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm disabled:opacity-60"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="text-sm font-medium text-slate-800">
                  Default Vote Price
                </label>
                <input
                  type="number"
                  name="defaultVotePrice"
                  min={0}
                  disabled={loading}
                  placeholder="100"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm disabled:opacity-60"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-800">
                  Status
                </label>
                <select
                  name="status"
                  defaultValue="DRAFT"
                  disabled={loading}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm disabled:opacity-60"
                >
                  <option value="DRAFT">DRAFT</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="ENDED">ENDED</option>
                  <option value="DISABLED">DISABLED</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {loading ? 'Creating…' : 'Create Poll'}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => router.push('/admin/elections-crud')}
              className="rounded-2xl border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
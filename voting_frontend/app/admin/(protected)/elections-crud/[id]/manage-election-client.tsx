'use client'
import React, { useMemo, useState, useEffect } from 'react';
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

function toDateInputValue(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function toIsoDateOnly(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function formatMoney(n: number | null) {
  if (n === null || n === undefined) return '-';
  return `₦${Number(n || 0).toLocaleString()}`;
}

function formatStatusBadge(status: string) {
  const s = String(status || '').toUpperCase();

  if (s === 'ACTIVE') {
    return 'border-green-200 bg-green-100 text-green-700';
  }

  if (s === 'DRAFT') {
    return 'border-slate-200 bg-slate-100 text-slate-700';
  }

  if (s === 'ENDED') {
    return 'border-amber-200 bg-amber-100 text-amber-700';
  }

  if (s === 'DISABLED') {
    return 'border-red-200 bg-red-100 text-red-700';
  }

  return 'border-gray-200 bg-gray-100 text-gray-700';
}

export default function ManageElectionClient({
  initialElection,
  initialCandidates,
}: {
  initialElection: Election;
  initialCandidates: Candidate[];
}): React.ReactElement {
  const electionId = initialElection.electionId;

  const [election, setElection] = useState<Election>(initialElection);
  const [candidates, setCandidates] = useState<Candidate[]>(initialCandidates);
  const [candidateFile, setCandidateFile] = useState<File | null>(null);
  const [candidatePreview, setCandidatePreview] = useState<string | null>(null);
  const [editCandidateFile, setEditCandidateFile] = useState<File | null>(null);
  const [editPreview, setEditPreview] = useState<string | null>(null);
useEffect(() => {
  return () => {
    if (candidatePreview) {
      URL.revokeObjectURL(candidatePreview);
    }

    if (editPreview) {
      URL.revokeObjectURL(editPreview);
    }
  };
}, [candidatePreview, editPreview]);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    photoUrl: '',
    votePrice: '',
  });

  const [selectedFileName, setSelectedFileName] = useState('');
const [editSelectedFileName, setEditSelectedFileName] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: initialElection.title,
    description: initialElection.description ?? '',
    startDate: toDateInputValue(initialElection.startDate),
    endDate: toDateInputValue(initialElection.endDate),
    defaultVotePrice: initialElection.defaultVotePrice ?? '',
  });

  const [candidateForm, setCandidateForm] = useState({
    name: '',
    description: '',
    photoUrl: '',
    votePrice: '',
  });

  const statusOptions = useMemo(
    () => ['DRAFT', 'ACTIVE', 'ENDED', 'DISABLED'],
    [],
  );

  async function apiJson(path: string, init: RequestInit) {
    const res = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.headers || {}),
        Accept: 'application/json',
      },
    });

    const text = await res.text();
    if (!res.ok) {
      let msg = `Failed (${res.status})`;
      try {
        const data = JSON.parse(text);
        msg = data?.message || msg;
      } catch {
        if (text) msg = text;
      }
      throw new Error(msg);
    }

    return text ? JSON.parse(text) : null;
  }

  async function refreshCandidates() {
    const list = await apiJson(`/api/admin/elections/${electionId}/candidates`, {
      method: 'GET',
    });
    setCandidates(list || []);
  }

  async function onSaveElection() {
    setErr(null);
    setMsg(null);

    const startIso = toIsoDateOnly(form.startDate);
    const endIso = toIsoDateOnly(form.endDate);

    if (!form.title.trim()) return setErr('Poll title is required');
    if (!startIso || !endIso) return setErr('Start and end dates are required');
    if (new Date(startIso).getTime() > new Date(endIso).getTime()) {
      return setErr('End date must be the same as or later than the start date');
    }

    let defaultVotePrice: number | undefined = undefined;
    if (String(form.defaultVotePrice).trim() !== '') {
      const n = Number(form.defaultVotePrice);
      if (!Number.isFinite(n) || n < 0) {
        return setErr('Default vote price must be >= 0');
      }
      defaultVotePrice = n;
    }

    const payload: any = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      startDate: startIso,
      endDate: endIso,
      defaultVotePrice: defaultVotePrice ?? null,
    };

    setSaving(true);
    try {
      const updated = await apiJson(`/api/admin/elections/${electionId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setElection(updated);
      setMsg('Poll updated');
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  async function onSetStatus(nextStatus: string) {
    setErr(null);
    setMsg(null);
    setStatusSaving(true);

    try {
      const updated = await apiJson(`/api/admin/elections/${electionId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      setElection(updated);
      setMsg(`Status set to ${nextStatus}`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setStatusSaving(false);
    }
  }

  async function onAddCandidate() {
  setErr(null);
  setMsg(null);

  const name = candidateForm.name.trim();
if (!name) return setErr('Nominee name is required');

  let votePrice: number | undefined = undefined;
  if (candidateForm.votePrice.trim() !== '') {
    const n = Number(candidateForm.votePrice);
    if (!Number.isFinite(n) || n < 0) {
      return setErr('Nominee vote price must be >= 0');
    }
    votePrice = n;
  }

  const payload = {
    name,
    description: candidateForm.description.trim() || null,
    votePrice: votePrice ?? null,
    photoUrl: candidateForm.photoUrl.trim() || null,
  };

  console.log('SENDING PAYLOAD:', payload);

  setAddingCandidate(true);
  try {
   const formData = new FormData();

// ✅ REQUIRED FIELD (always trimmed)
formData.append('name', name.trim());

// ✅ OPTIONAL FIELDS (only if valid)
if (candidateForm.description?.trim()) {
  formData.append('description', candidateForm.description.trim());
}

if (votePrice !== undefined && votePrice !== null) {
  formData.append('votePrice', String(votePrice));
}

if (candidateForm.photoUrl?.trim()) {
  formData.append('photoUrl', candidateForm.photoUrl.trim());
}

// ✅ FILE (IF EXISTS)
const file = candidateFile;

if (file instanceof File) {
  formData.append('image', file);
}

// 🧪 DEBUG (VERY IMPORTANT — keep for now)
for (const [k, v] of formData.entries()) {
  console.log('FORMDATA >>>', k, v);
}

// ✅ SEND REQUEST
const res = await fetch(
  `/api/admin/elections/${electionId}/candidates`,
  {
    method: 'POST',
    body: formData,
    credentials: 'include',
  }
);

// ✅ HANDLE RESPONSE
const text = await res.text();
console.log('UPLOAD RESPONSE >>>', text);

if (!res.ok) {
  throw new Error(text || `Failed (${res.status})`);
}
    // ✅ RESET
    (window as any).__candidateFile = null;
    setSelectedFileName('');

    setCandidateForm({
      name: '',
      description: '',
      photoUrl: '',
      votePrice: '',
    });

    await refreshCandidates();

    // ✅ SMART MESSAGE
    setMsg(file ? 'Nominee added with image!' : 'Nominee added successfully');
  } catch (e: any) {
    setErr(String(e?.message || e));
  } finally {
    setAddingCandidate(false);
  }
}

  async function onDeleteCandidate(candidateId: number) {
  setErr(null);
  setMsg(null);

  const yes = window.confirm('Delete this nominee? This cannot be undone.');
  if (!yes) return;

  try {
    await apiJson(`/api/admin/candidates/${candidateId}`, {
      method: 'DELETE',
    });

    // ✅ REMOVE FROM UI IMMEDIATELY
    setCandidates((prev) =>
      prev.filter((c) => c.candidateId !== candidateId)
    );

    setMsg('Nominee deleted');
  } catch (e: any) {
    setErr(String(e?.message || e));
  }
}

  function startEdit(c: Candidate) {
    if (editSaving) return;
setEditingId(c.candidateId);
    setEditForm({
      name: c.name ?? '',
      description: c.description ?? '',
      photoUrl: c.photoUrl ?? '',
      votePrice:
        c.votePrice === null || c.votePrice === undefined
          ? ''
          : String(c.votePrice),
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm({ name: '', description: '', photoUrl: '', votePrice: '' });
  }

  async function onSaveEdit(candidateId: number) {
  setErr(null);
  setMsg(null);

  const name = editForm.name.trim();
  if (!name) return setErr('Nominee name is required');

  let votePrice: number | null = null;

  if (editForm.votePrice.trim() !== '') {
    const n = Number(editForm.votePrice);
    if (!Number.isFinite(n) || n < 0) {
      return setErr('Nominee vote price must be >= 0');
    }
    votePrice = n;
  }

  setEditSaving(true);

  try {
    const file = editCandidateFile;

   /* ============================================================
   ALWAYS USE FORMDATA (CONSISTENT + SAFE)
============================================================ */

const formData = new FormData();

// ✅ REQUIRED
formData.append('name', name);

// ✅ ALWAYS SEND (important for clearing values)
formData.append('description', editForm.description || '');
formData.append('photoUrl', editForm.photoUrl || '');

// ✅ OPTIONAL (only if valid number)
if (votePrice !== null) {
  formData.append('votePrice', String(votePrice));
}

// ✅ FILE (highest priority — overrides photoUrl)
if (file instanceof File) {
  formData.append('image', file);
}

// ✅ SEND REQUEST
const res = await fetch(`/api/admin/candidates/${candidateId}`, {
  method: 'PATCH',
  body: formData,
  credentials: 'include',
});

// ✅ SAFELY PARSE RESPONSE
let updated: any = null;

try {
  updated = await res.json();
} catch {
  updated = null;
}

console.log('EDIT RESPONSE >>>', updated);

if (!res.ok) {
  throw new Error(updated?.message || 'Failed update');
}

// ✅ RESET FILE STATE
setEditCandidateFile(null);
setEditSelectedFileName('');
setEditPreview(null);

// ✅ CLOSE EDIT FIRST (better UX)
cancelEdit();

// ✅ UPDATE UI INSTANTLY (if backend returned data)
if (updated) {
  setCandidates((prev) =>
    prev.map((c) =>
      c.candidateId === candidateId
        ? {
            ...c, // ✅ keep existing full structure
            ...updated, // ✅ merge updated fields only
            photoUrl: updated.photoUrl
              ? `${updated.photoUrl}?t=${Date.now()}`
              : c.photoUrl, // ✅ fallback to existing if not returned
          }
        : c,
    ),
  );
} else {
  // ✅ fallback (safe for backend inconsistencies)
  await refreshCandidates();
}

// ✅ SUCCESS MESSAGE
setMsg(file ? 'Nominee updated with image!' : 'Nominee updated');
} catch (e: any) {
  setErr(String(e?.message || e));
} finally {
  setEditSaving(false);
}
  }
 return (
  <div className="space-y-6">
    {(err || msg) && (
      <div
        className={`rounded-2xl border px-4 py-3 text-sm font-semibold shadow-sm ${
          err
            ? 'border-red-200 bg-red-50 text-red-700'
            : 'border-green-200 bg-green-50 text-green-700'
        }`}
      >
        {err || msg}
      </div>
    )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{election.title}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium">
                Poll ID: {election.electionId}
              </span>
              <span
                className={`inline-flex rounded-full border px-2.5 py-1 font-semibold ${formatStatusBadge(
                  election.status,
                )}`}
              >
                {election.status}
              </span>
              <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-700">
                Default Price: {formatMoney(election.defaultVotePrice)}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <select
              value={election.status}
              onChange={(e) => onSetStatus(e.target.value)}
              disabled={statusSaving}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {statusOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            {statusSaving ? (
              <span className="text-sm font-medium text-slate-500">
                Updating status…
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid gap-5">
          <div>
            <label
              htmlFor="poll-title"
              className="block text-sm font-medium text-slate-800"
            >
              Title
            </label>
            <input
              id="poll-title"
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="poll-description"
              className="block text-sm font-medium text-slate-800"
            >
              Description
            </label>
            <textarea
              id="poll-description"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={4}
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="poll-start-date"
                className="block text-sm font-medium text-slate-800"
              >
                Start Date
              </label>
              <input
                id="poll-start-date"
                type="date"
                value={form.startDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, startDate: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label
                htmlFor="poll-end-date"
                className="block text-sm font-medium text-slate-800"
              >
                End Date
              </label>
              <input
                id="poll-end-date"
                type="date"
                value={form.endDate}
                onChange={(e) =>
                  setForm((p) => ({ ...p, endDate: e.target.value }))
                }
                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="max-w-xs">
            <label
              htmlFor="poll-default-price"
              className="block text-sm font-medium text-slate-800"
            >
              Default Vote Price
            </label>
            <input
              id="poll-default-price"
              type="number"
              min={0}
              step="1"
              value={String(form.defaultVotePrice)}
              onChange={(e) =>
                setForm((p) => ({ ...p, defaultVotePrice: e.target.value }))
              }
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onSaveElection}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
  
  {/* HEADER */}
  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
    <h2 className="text-xl font-bold text-slate-900">Nominees</h2>
    <p className="mt-1 text-sm text-slate-500">
      Total nominees: {candidates.length}
    </p>
  </div>
        

        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <input
              placeholder="Nominee name"
              value={candidateForm.name || ''}
              onChange={(e) =>
                setCandidateForm((p) => ({ ...p, name: e.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
            <input
              placeholder="Vote price (optional)"
              value={candidateForm.votePrice || ''}
              onChange={(e) =>
                setCandidateForm((p) => ({ ...p, votePrice: e.target.value }))
              }
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <textarea
            placeholder="Description (optional)"
            value={candidateForm.description || ''}
            onChange={(e) =>
              setCandidateForm((p) => ({ ...p, description: e.target.value }))
            }
            rows={3}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
          />

        {/* Upload Image (optional) */}
<div className="space-y-3">
  <label className="block text-sm font-medium text-slate-800">
    Upload Image (optional)
  </label>

  {/* DROP ZONE */}
  <div
    onDragOver={(e) => e.preventDefault()}
    onDrop={(e) => {
      e.preventDefault();

      const file = e.dataTransfer.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Only image files are allowed');
        return;
      }

      if (file.size > 1024 * 1024) {
        alert('Image must be less than 1MB');
        return;
      }

      setCandidateFile(file);
      setSelectedFileName(file.name);

      // clear URL if file is used
      setCandidateForm((p) => ({ ...p, photoUrl: '' }));

      const previewUrl = URL.createObjectURL(file);
      setCandidatePreview(previewUrl);
    }}
    onClick={() => document.getElementById('candidateFileInput')?.click()}
    className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-6 py-6 text-center hover:border-blue-400 hover:bg-blue-50 transition cursor-pointer"
  >
    <p className="text-sm font-medium text-slate-700">
      Drag & drop an image here
    </p>
    <p className="text-xs text-slate-500">
      or click to upload (max 1MB)
    </p>

    <input
      id="candidateFileInput"
      type="file"
      accept="image/*"
      hidden
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
          alert('Only image files are allowed');
          return;
        }

        if (file.size > 1024 * 1024) {
          alert('Image must be less than 1MB');
          return;
        }

        setCandidateFile(file);
        setSelectedFileName(file.name);

        // clear URL if file is used
        setCandidateForm((p) => ({ ...p, photoUrl: '' }));

        const previewUrl = URL.createObjectURL(file);
        setCandidatePreview(previewUrl);

        console.log('SELECTED FILE >>>', file.name);
      }}
    />
  </div>

  {/* FILE NAME */}
  <div className="text-xs text-slate-500">
    Selected:{' '}
    <span className="font-medium text-slate-700">
      {selectedFileName || 'No file selected'}
    </span>
  </div>

  {/* PREVIEW + ACTIONS */}
  {candidatePreview && (
    <div className="flex items-center gap-3 pt-2">
      <img
        src={candidatePreview}
        alt="Preview"
        className="w-20 h-20 rounded-xl object-cover border border-slate-200"
      />

      <div className="flex flex-col gap-1">
        {/* Replace */}
        <button
          type="button"
          onClick={() =>
            document.getElementById('candidateFileInput')?.click()
          }
          className="text-xs text-blue-600 hover:underline"
        >
          Replace image
        </button>

        {/* Remove */}
        <button
          type="button"
          onClick={() => {
            setCandidateFile(null);
            setCandidatePreview(null);
            setSelectedFileName('');
          }}
          className="text-xs text-red-500 hover:underline"
        >
          Remove
        </button>
      </div>
    </div>
  )}
</div>

{/* OR Photo URL */}
<div className="space-y-2">
  <label className="block text-sm font-medium text-slate-800">
    Or Use Image URL
  </label>

  <input
  placeholder="https://example.com/jpeg"
  value={candidateForm.photoUrl || ''}
  onChange={(e) => {
    const url = e.target.value;

    // clear file if URL is used
    setCandidateFile(null);
    setCandidatePreview(null);
    setSelectedFileName('');

    setCandidateForm((p) => ({
      ...p,
      photoUrl: url,
    }));
  }}
  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
/>

<div className="flex flex-wrap items-center gap-3 pt-1">
  <button
    type="button"
    onClick={onAddCandidate}
    disabled={addingCandidate}
    className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
  >
    {addingCandidate ? 'Adding…' : 'Add Nominee'}
  </button>
</div>
</div>

<div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
  <div className="overflow-x-auto">
    <table className="min-w-full border-collapse">
      <thead className="bg-slate-50">
        <tr>
          <th className="border-b px-4 py-3 text-left text-sm font-semibold">Name</th>
          <th className="border-b px-4 py-3 text-left text-sm font-semibold">Vote Price</th>
          <th className="border-b px-4 py-3 text-left text-sm font-semibold">Created</th>
          <th className="border-b px-4 py-3 text-right text-sm font-semibold">Actions</th>
        </tr>
      </thead>

      <tbody>
        {candidates.length ? (
          candidates.map((c) => (
            <tr key={c.candidateId} className="align-top">
              <td className="border-b px-4 py-4 text-sm">
                {editingId === c.candidateId ? (
                  <div className="grid gap-3">

                    {/* NAME */}
                    <input
                      value={editForm.name}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, name: e.target.value }))
                      }
                      className="w-full rounded-2xl border px-4 py-3"
                    />

                    {/* DESCRIPTION */}
                    <textarea
                      value={editForm.description}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, description: e.target.value }))
                      }
                      rows={2}
                      className="w-full rounded-2xl border px-4 py-3"
                    />

                    {/* PHOTO URL */}
                    <input
                      value={editForm.photoUrl}
                      onChange={(e) => {
                        const url = e.target.value;

                        // clear file
                        setEditCandidateFile(null);
                        setEditPreview(null);
                        setEditSelectedFileName('');

                        setEditForm((p) => ({
                          ...p,
                          photoUrl: url,
                        }));
                      }}
                      placeholder="Photo URL"
                      className="w-full rounded-2xl border px-4 py-3"
                    />

                    {/* IMAGE UPLOAD (EDIT) */}
                    <div className="space-y-2">

                      {/* DROP ZONE */}
                      <div
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();

                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;

                          if (!file.type.startsWith('image/')) {
                            alert('Only images allowed');
                            return;
                          }

                          if (file.size > 1024 * 1024) {
                            alert('Max 1MB');
                            return;
                          }

                          setEditCandidateFile(file);
                          setEditSelectedFileName(file.name);
                          setEditForm((p) => ({ ...p, photoUrl: '' }));

                          setEditPreview(URL.createObjectURL(file));
                        }}
                        onClick={() =>
                          document.getElementById(`editFile-${c.candidateId}`)?.click()
                        }
                        className="cursor-pointer rounded-xl border-2 border-dashed p-4 text-center"
                      >
                        Drag or click to upload
                        <input
                          id={`editFile-${c.candidateId}`}
                          type="file"
                          hidden
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;

                            setEditCandidateFile(file);
                            setEditSelectedFileName(file.name);
                            setEditForm((p) => ({ ...p, photoUrl: '' }));

                            setEditPreview(URL.createObjectURL(file));
                          }}
                        />
                      </div>

                      {/* FILE NAME */}
                      <div className="text-xs flex justify-between">
                        <span>{editSelectedFileName || 'No file'}</span>

                        {editSelectedFileName && (
                          <button
                            onClick={() => {
                              setEditCandidateFile(null);
                              setEditPreview(null);
                              setEditSelectedFileName('');
                            }}
                            className="text-red-500"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      {/* PREVIEW */}
                      {editPreview && (
                        <img
                          src={editPreview}
                          className="w-16 h-16 rounded object-cover"
                        />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    {c.photoUrl ? (
                      <img src={c.photoUrl} className="w-10 h-10 rounded-full" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        {c.name?.[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.description || 'No description'}
                      </div>
                    </div>
                  </div>
                )}
              </td>

              <td className="border-b px-4 py-4">
                {editingId === c.candidateId ? (
                  <input
                    value={editForm.votePrice}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        votePrice: e.target.value,
                      }))
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                ) : (
                  formatMoney(c.votePrice)
                )}
              </td>

              <td className="border-b px-4 py-4">
                {String(c.createdAt).slice(0, 10)}
              </td>

              <td className="border-b px-4 py-4 text-right">
                {editingId === c.candidateId ? (
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => onSaveEdit(c.candidateId)}
                      className="bg-blue-600 text-white px-4 py-2 rounded"
                    >
                      Save
                    </button>
                    <button onClick={cancelEdit}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => startEdit(c)}>Edit</button>
                    <button onClick={() => onDeleteCandidate(c.candidateId)}>
                      Delete
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="text-center py-6">
              No nominees yet
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
</div>
</div>
</div>
</div>
);
}
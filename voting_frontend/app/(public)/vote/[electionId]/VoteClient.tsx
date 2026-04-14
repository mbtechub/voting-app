'use client';

import { useMemo, useState } from 'react';

type Candidate = {
  candidateId: number;
  electionId: number;
  votePrice?: number | null;

  name?: string | null;
  description?: string | null;
  photoUrl?: string | null;
};

type AddToCartPayload = {
  cartUuid?: string;
  items: Array<{
    electionId: number;
    candidateId: number;
    voteQty: number;
  }>;
};

type AddToCartResponse = {
  cartUuid: string;
  totalAmount?: number;
};

export default function VoteClient({
  electionId,
  candidates,
}: {
  electionId: number;
  candidates: Candidate[];
}) {
  const [qtyByCandidate, setQtyByCandidate] = useState<Record<number, number>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addedCart, setAddedCart] = useState<{
    open: boolean;
    cartUuid: string;
  }>({
    open: false,
    cartUuid: '',
  });

  const totalSelected = useMemo(() => {
    return Object.values(qtyByCandidate).reduce((a, b) => a + (b || 0), 0);
  }, [qtyByCandidate]);

  function setQty(candidateId: number, next: number) {
    const safe = Number.isFinite(next)
      ? Math.max(0, Math.floor(next))
      : 0;

    setQtyByCandidate((prev) => ({
      ...prev,
      [candidateId]: safe,
    }));
  }

  async function addToCart() {
    setError(null);

    const items = Object.entries(qtyByCandidate)
      .map(([cid, qty]) => ({
        electionId,
        candidateId: Number(cid),
        voteQty: Number(qty || 0),
      }))
      .filter((x) => x.voteQty > 0);

    if (items.length === 0) {
      setError('Select at least 1 vote before adding to cart.');
      return;
    }

    setBusy(true);

    try {
      let cartUuid =
        typeof window !== 'undefined'
          ? localStorage.getItem('cartUuid')
          : null;

      let finalCartUuid = cartUuid?.trim() || '';

      if (!finalCartUuid) {
        const res = await fetch('/api/public/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items }),
          cache: 'no-store',
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.message || 'Failed to create cart');
        }

        finalCartUuid = data.cartUuid;
      } else {
        for (const item of items) {
          const res = await fetch(`/api/cart/${finalCartUuid}/item`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
          });

          const data = await res.json();

          if (!res.ok) {
            throw new Error(data?.message || 'Failed to add item');
          }
        }
      }

      localStorage.setItem('cartUuid', finalCartUuid);
      window.dispatchEvent(new Event('cartUpdated'));

      setAddedCart({
        open: true,
        cartUuid: finalCartUuid,
      });

      setQtyByCandidate({});
    } catch (e: any) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mt-6">
        {error && (
          <div className="mb-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {candidates.map((raw) => {
            // 🔥 FINAL NORMALIZATION (covers ALL cases)
            const photoUrl =
              raw.photoUrl ??
              (raw as any).photo_url ??
              (raw as any).PHOTO_URL ??
              null;

            const hasImage =
              typeof photoUrl === 'string' &&
              photoUrl.trim() !== '';

            const qty = qtyByCandidate[raw.candidateId] ?? 0;

            const displayName =
              (raw.name || '').trim() ||
              `Candidate #${raw.candidateId}`;

            return (
              <div
                key={raw.candidateId}
                className="rounded-2xl border bg-white p-4 shadow-sm flex items-center justify-between gap-4"
              >
                {/* LEFT */}
                <div className="flex items-center gap-3 flex-1">
                  {hasImage ? (
                    <img
                      src={photoUrl}
                      alt={displayName}
                      className="w-12 h-12 rounded-xl object-cover"
                      crossOrigin="anonymous"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          'none';
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center font-semibold text-gray-600">
                      {displayName[0]}
                    </div>
                  )}

                  <div>
                    <div className="font-semibold text-gray-900">
                      {displayName}
                    </div>

                    <div className="mt-1 text-xs text-gray-500">
                      Votes
                    </div>
                  </div>
                </div>

                {/* RIGHT */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(raw.candidateId, qty - 1)}
                    disabled={busy || qty <= 0}
                    className="w-8 h-8 rounded-lg border"
                  >
                    −
                  </button>

                  <input
                    value={qty}
                    onChange={(e) => {
                      const val = e.target.value;

                      if (val === '') {
                        setQty(raw.candidateId, 0);
                        return;
                      }

                      const num = Number(val);
                      if (!Number.isNaN(num) && num >= 0) {
                        setQty(raw.candidateId, num);
                      }
                    }}
                    className="w-14 h-8 rounded-lg border text-center text-sm"
                    inputMode="numeric"
                  />

                  <button
                    onClick={() => setQty(raw.candidateId, qty + 1)}
                    disabled={busy}
                    className="w-8 h-8 rounded-lg bg-black text-white"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* SUMMARY */}
        <div className="mt-6 flex flex-col gap-3 rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-gray-700">
            Selected votes:{' '}
            <span className="font-semibold">{totalSelected}</span>
          </div>

          <button
            onClick={addToCart}
            disabled={busy || totalSelected <= 0}
            className="rounded-xl bg-black px-5 py-3 text-white disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Add to cart'}
          </button>
        </div>
      </div>

      {/* POPUP */}
      {addedCart.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold">Added to cart</h3>

            <div className="mt-4 flex gap-3">
              <button
                onClick={() =>
                  setAddedCart({ open: false, cartUuid: '' })
                }
                className="flex-1 border px-4 py-2 rounded-xl"
              >
                Continue Voting
              </button>

              <button
                onClick={() =>
                  window.location.assign(`/cart/${addedCart.cartUuid}`)
                }
                className="flex-1 bg-black text-white px-4 py-2 rounded-xl"
              >
                View Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
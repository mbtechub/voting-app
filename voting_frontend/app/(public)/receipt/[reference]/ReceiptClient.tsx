'use client';

import { useEffect, useState } from 'react';
import { publicFetch } from '@/lib/public-api';

type Receipt = {
  payment?: {
    status?: string;
    amount?: number;
    paidAt?: string;
  };

  cart?: {
    cartUuid?: string;
    totalAmount?: number;
  };

  summary?: {
    itemsTotal?: number;
    appliedTotal?: number;
    skippedTotal?: number;
  };

  items?: {
    // ✅ PDF-style structure
    poll?: {
      title?: string;
    };

    nominee?: {
      name?: string;
    };

    // ✅ API-style structure
    election?: {
      electionId?: number;
      title?: string;
    };

    candidate?: {
      candidateId?: number;
      name?: string;
    };

    // ✅ fallback aliases
    pollTitle?: string;
    nomineeName?: string;

    voteQty?: number;
    subTotal?: number;
  }[];
};

function formatMoney(v: any) {
  return `₦${Number(v || 0).toLocaleString()}`;
}

export default function ReceiptClient({
  apiBase,
  reference,
}: {
  apiBase: string;
  reference: string;
}) {
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isPolling, setIsPolling] = useState(true);

  // ✅ FIXED + TYPED POLLING
  useEffect(() => {
    let isMounted = true;
    let attempts = 0;

    const fetchReceipt = async () => {
      try {
        const res = await publicFetch<Receipt>(
          `/api/public/receipt/${reference}`,
        );

        if (!isMounted) return;

        setReceipt(res);

        const status =
          res?.payment?.status ||
          (Number(res?.summary?.appliedTotal || 0) > 0
            ? 'SUCCESS'
            : 'INITIATED');

        if (status === 'SUCCESS') {
          setLoading(false);
          setIsPolling(false);
          return;
        }

        attempts++;

        if (attempts >= 10) {
          setLoading(false);
          setIsPolling(false);
          return;
        }

        setTimeout(fetchReceipt, 3000);
      } catch (err) {
        console.error('Polling failed:', err);
        setLoading(false);
        setIsPolling(false);
      }
    };

    fetchReceipt();

    return () => {
      isMounted = false;
    };
  }, [reference]);

  // ✅ CLEAN COUNTDOWN
  useEffect(() => {
    if (!isPolling) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPolling]);
  // ✅ CLEAR CART IMMEDIATELY AFTER SUCCESSFUL PAYMENT
  useEffect(() => {
    if (!receipt) return;

    const status =
      receipt.payment?.status ||
      (Number(receipt.summary?.appliedTotal || 0) > 0
        ? 'SUCCESS'
        : 'INITIATED');

    if (status !== 'SUCCESS') return;

    try {
      localStorage.removeItem('cartUuid');
      localStorage.removeItem('cartTotal');
      localStorage.setItem('cartCount', '0');

      window.dispatchEvent(
        new Event('cartUpdated')
      );

      console.log('✅ Cart cleared after successful payment');
    } catch (err) {
      console.error('Failed to clear cart state', err);
    }
  }, [receipt]);
  
  // ✅ STRIPE-STYLE LOADING
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="relative mb-6">
          <div className="h-12 w-12 rounded-full border-4 border-gray-200"></div>
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-black border-t-transparent animate-spin"></div>
        </div>

        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Confirming your payment...
        </h2>

        <p className="text-sm text-gray-500">
          This may take a few seconds
        </p>

        <p className="mt-3 text-xs text-gray-400">
          Auto-refreshing ({secondsLeft}s)
        </p>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="text-center py-16 text-red-500">
        Failed to load receipt
      </div>
    );
  }

  const status =
    receipt.payment?.status ||
    (Number(receipt.summary?.appliedTotal || 0) > 0
      ? 'SUCCESS'
      : 'INITIATED');

  const statusClass =
    status === 'SUCCESS'
      ? 'bg-green-100 text-green-700'
      : status === 'FAILED'
      ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(reference);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      await navigator.share({
        title: 'Voting Receipt',
        url,
      });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Receipt link copied');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
  try {
    setDownloading(true);

    // ✅ Always build URL safely
    const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
    const url = `${base}/api/public/receipt/${reference}/pdf`;

    console.log('📥 Downloading receipt from:', url);

    const res = await fetch(url, {
      method: 'GET',
    });

    // 🔥 CRITICAL: show real backend error
    if (!res.ok) {
      const text = await res.text();
      console.error('❌ DOWNLOAD ERROR:', text);
      throw new Error(text || `Download failed (${res.status})`);
    }

    const blob = await res.blob();

    // ✅ Safety check (prevents empty/corrupt PDF)
    if (!blob || blob.size === 0) {
      throw new Error('Empty PDF received');
    }

    const downloadUrl = window.URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `${reference}.pdf`;
    document.body.appendChild(a);
    a.click();

    a.remove();
    window.URL.revokeObjectURL(downloadUrl);

    console.log('✅ Download successful');

  } catch (err) {
    console.error('❌ DOWNLOAD FAILED:', err);
    alert('Download failed. Check console for details.');
  } finally {
    setDownloading(false);
  }
};
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 transition-all duration-300">

      {/* STATUS */}
      <div className="mb-5">
        <span className={`px-4 py-1 text-xs font-semibold rounded-full ${statusClass}`}>
          {status}
        </span>
      </div>

      {/* DETAILS */}
      <div className="grid sm:grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-xs text-gray-500">Reference</p>
          <div className="flex items-center gap-2">
            <p className="font-medium text-gray-900">{reference}</p>
            <button onClick={handleCopy} className="text-xs text-blue-600">
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500">Amount</p>
          <p className="font-medium text-gray-900">
            {formatMoney(
              receipt.payment?.amount ??
                receipt.summary?.itemsTotal,
            )}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Paid At</p>
          <p className="font-medium text-gray-900">
            {receipt.payment?.paidAt || '-'}
          </p>
        </div>

        <div>
          <p className="text-xs text-gray-500">Cart Total</p>
          <p className="font-medium text-gray-900">
            {formatMoney(receipt.cart?.totalAmount)}
          </p>
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p className="text-xs text-gray-500">Cart UUID</p>
        <p className="text-gray-600 break-all">
          {receipt.cart?.cartUuid}
        </p>
      </div>

      <hr className="my-6 border-gray-200" />

      {/* ITEMS */}
      <table className="w-full text-sm">
        <thead className="text-gray-500 text-xs border-b">
          <tr>
            <th className="text-left py-2">Poll</th>
            <th className="text-left py-2">Nominee</th>
            <th className="text-left py-2">Votes</th>
            <th className="text-right py-2">Total</th>
          </tr>
        </thead>

        <tbody>
  {(receipt.items || []).map((i, idx) => {
    const pollTitle =
  i.election?.title ||
  i.poll?.title ||
  i.pollTitle ||
  '-';

const nomineeName =
  i.candidate?.name ||
  i.nominee?.name ||
  i.nomineeName ||
  '-';
    return (
      <tr key={idx} className="border-b">
        <td className="py-3">{pollTitle}</td>
        <td>{nomineeName}</td>
        <td>{i.voteQty ?? 0}</td>
        <td className="text-right">
          {formatMoney(i.subTotal)}
        </td>
      </tr>
    );
  })}
</tbody>
</table>

<hr className="my-6 border-gray-200" />

{/* TOTALS */}
<div className="flex flex-col items-end text-sm space-y-1">
  <p>Items Total: {formatMoney(receipt.summary?.itemsTotal)}</p>
  <p>Applied Total: {formatMoney(receipt.summary?.appliedTotal)}</p>
  <p>Skipped Total: {formatMoney(receipt.summary?.skippedTotal)}</p>
</div>

{/* ACTIONS */}
<div className="flex justify-center gap-3 mt-8">
  <button onClick={handlePrint} className="px-4 py-2 border rounded-xl">
    Print
  </button>

  <button onClick={handleShare} className="px-4 py-2 border rounded-xl">
    Share
  </button>

  <button
    onClick={handleDownload}
    disabled={downloading}
    className="px-5 py-2 bg-gray-900 text-white rounded-xl"
  >
    {downloading ? 'Downloading...' : 'Download PDF'}
  </button>
</div>

<p className="text-center text-xs text-gray-400 mt-8">
  <p>Business Automation Management System.</p>
        <p>Mide Bash</p>
</p>
    </div>
  );
}
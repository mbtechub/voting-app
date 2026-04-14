import Link from 'next/link';
import { publicFetch } from '@/lib/public-api';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

type Poll = {
  electionId: number;
  title: string;
  description?: string | null;
  status?: string | null;
};

export const dynamic = 'force-dynamic';

export default async function VoteHomePage() {
  let polls: Poll[] = [];
  let hasError = false;

  try {
    const res = await publicFetch<any[]>('/api/public/elections');

    // 🔥 SAFE NORMALIZATION (handles Oracle + inconsistent API)
    polls = (res || []).map((p): Poll => ({
      electionId: Number(p?.electionId ?? p?.election_id ?? 0),
      title: String(p?.title ?? ''),
      description: p?.description ?? null,
      status: p?.status ?? null,
    }));
  } catch (error) {
    console.error('Failed to fetch elections:', error);
    hasError = true;
  }

  const visible = polls.filter((p) => {
    const status = (p.status || '').toUpperCase();
    return !status || status === 'ACTIVE';
  });

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
          Active Elections
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a poll to view nominees and add votes to your cart.
        </p>
      </div>

      {/* ERROR */}
      {hasError && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <p className="text-sm text-red-700 dark:text-red-400">
            Failed to load polls. Please refresh the page.
          </p>
        </Card>
      )}

      {/* EMPTY */}
      {!hasError && visible.length === 0 && (
        <Card className="text-center py-8 dark:bg-slate-900">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No active polls available right now.
          </p>
        </Card>
      )}

      {/* GRID */}
      {!hasError && visible.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <Card
              key={p.electionId}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm hover:shadow-md transition"
            >
              {/* CONTENT */}
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white leading-snug">
                  {p.title}
                </h2>

                {p.description && (
                  <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                    {p.description}
                  </p>
                )}
              </div>

              {/* CTA */}
              <div className="mt-5">
                <Link href={`/vote/${p.electionId}`} className="block">
                  <Button className="w-full rounded-xl bg-gray-900 text-white hover:bg-black transition active:scale-[0.98]">
                    Vote Now
                  </Button>
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
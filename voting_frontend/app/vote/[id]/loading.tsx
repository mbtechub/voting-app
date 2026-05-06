export default function Loading() {
  return (
    <div className="grid gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="h-4 w-2/3 bg-slate-200 rounded mb-3" />
          <div className="h-3 w-full bg-slate-200 rounded mb-2" />
          <div className="h-3 w-5/6 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}
/** Placeholder shown while an uncached token or wallet page renders on the server. */
export function PageSkeleton({ label }: { label: string }) {
  return (
    <div className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 sm:pt-12" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
        <div className="mx-auto aspect-[4/5] w-full max-w-[300px] animate-pulse rounded-[22px] bg-muted" />
        <div>
          <div className="h-12 w-48 animate-pulse rounded-xl bg-muted" />
          <div className="mt-3 h-5 w-64 animate-pulse rounded bg-muted" />
          <div className="mt-7 h-14 w-40 animate-pulse rounded-xl bg-muted" />
          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="h-[74px] animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="panel h-72 animate-pulse" />
        <div className="panel h-72 animate-pulse" />
      </div>
      <p className="mt-6 text-center text-sm text-slate">{label}</p>
    </div>
  );
}

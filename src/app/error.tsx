"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-5 py-28 text-center">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Grail&apos;s data didn&apos;t load</h1>
      <p className="mt-3 text-slate">
        The Grail API didn&apos;t respond in time. This usually clears up within a minute.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-8 inline-flex rounded-full bg-graphite px-5 py-2.5 text-sm font-medium text-paper hover:bg-black"
      >
        Try again
      </button>
    </div>
  );
}

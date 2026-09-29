"use client";

import { startTransition, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNow } from "@/hooks/use-now";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Extra time past a page's revalidate window before its data counts as stale. */
const GRACE_MS = 60_000;
/**
 * Backoff between refresh attempts. The first request for an expired ISR page is answered from cache and starts a
 * rebuild in the background, so the fresh version usually lands a few seconds later.
 */
const RETRY_MS = [1_500, 4_000, 8_000, 15_000, 30_000];

/**
 * Shows how old the page's data is and, when it is older than the page's revalidate window, fetches the fresh
 * version right away instead of waiting for the next AutoRefresh tick.
 */
export function Freshness({
  at,
  maxAgeSec,
  label = "Updated",
  className,
}: {
  /** When the server rendered the data (ms). */
  at: number;
  /** The page's `revalidate` in seconds. */
  maxAgeSec: number;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  const now = useNow(at);
  const [tries, setTries] = useState({ at, n: 0 });
  const attempt = tries.at === at ? tries.n : 0;
  const stale = now - at > maxAgeSec * 1000 + GRACE_MS;
  const refreshing = stale && attempt < RETRY_MS.length;

  useEffect(() => {
    if (!refreshing) return;
    const id = window.setTimeout(() => {
      if (document.visibilityState === "visible" && navigator.onLine) startTransition(() => router.refresh());
      setTries({ at, n: attempt + 1 });
    }, RETRY_MS[attempt]);
    return () => window.clearTimeout(id);
  }, [refreshing, attempt, at, router]);

  const age = timeAgo(new Date(at).toISOString(), now);
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-sm text-slate", className)}
      role="status"
      aria-live="polite"
      title={new Date(at).toUTCString()}
    >
      <span className="relative flex size-2">
        {!stale && <span className="absolute inline-flex size-full animate-ping rounded-full bg-up opacity-40" />}
        <span className={cn("relative inline-flex size-2 rounded-full", stale ? "bg-gold" : "bg-up", refreshing && "animate-pulse")} />
      </span>
      {refreshing ? `Data from ${age}, refreshing…` : `${label} ${age}`}
    </span>
  );
}

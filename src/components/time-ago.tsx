"use client";

import { useNow } from "@/hooks/use-now";
import { timeAgo } from "@/lib/format";

/** Relative time that keeps counting in the browser, so a cached page never claims a trade happened "just now". */
export function TimeAgo({ iso, serverNow, className }: { iso: string; serverNow: number; className?: string }) {
  const now = useNow(serverNow);
  return (
    <time dateTime={iso} title={new Date(iso).toUTCString()} className={className}>
      {timeAgo(iso, now)}
    </time>
  );
}

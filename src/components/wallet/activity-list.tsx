import Link from "next/link";
import type { ActivityRow } from "@/lib/activity-rows";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { TimeAgo } from "../time-ago";

export function ActivityList({ rows, now }: { rows: ActivityRow[]; now: number }) {
  return (
    <ul className="mt-3 divide-y divide-hairline">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center justify-between gap-3 py-2.5 text-sm">
          <span className="flex min-w-0 items-center gap-2.5">
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                r.kind === "buy" ? "bg-up/10 text-up" : r.kind === "sell" ? "bg-down/10 text-down" : "bg-muted text-slate",
              )}
            >
              {r.label}
            </span>
            {r.href ? (
              <Link href={r.href} className="truncate font-medium hover:text-gold-ink">
                {r.ticker}
              </Link>
            ) : (
              <span className="truncate">{r.subject}</span>
            )}
          </span>
          <span className="flex shrink-0 items-center gap-3">
            <span className="tabular font-medium">{r.usd != null ? formatUsd(r.usd) : ""}</span>
            {r.txUrl ? (
              <a href={r.txUrl} target="_blank" rel="noreferrer" className="w-20 text-right text-xs text-slate hover:text-graphite">
                <TimeAgo iso={r.timestamp} serverNow={now} />
              </a>
            ) : (
              <TimeAgo iso={r.timestamp} serverNow={now} className="w-20 text-right text-xs text-slate" />
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

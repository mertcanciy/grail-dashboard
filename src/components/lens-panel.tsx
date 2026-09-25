"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { BreakdownRow, LensKey, LensSlice } from "@/lib/metrics";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Segmented } from "./segmented";

export type LensData = Record<"24h" | "7d", Record<LensKey, LensSlice>>;

const LENSES: { value: LensKey; label: string; noun: string }[] = [
  { value: "token", label: "gToken", noun: "gToken" },
  { value: "category", label: "Category", noun: "category" },
  { value: "venue", label: "Chain & pair", noun: "venue" },
  { value: "action", label: "Action", noun: "action" },
  { value: "wallet", label: "Wallet", noun: "wallet" },
];

const TOP = 8;

function insight(rows: BreakdownRow[], lens: LensKey, metric: "volume" | "count", win: string) {
  const top = rows[0];
  if (!top) return "No trades in this window yet.";
  const share = formatShare(metric === "volume" ? top.volumeShare : top.countShare);
  const what = metric === "volume" ? "of trading volume" : "of all trades";
  const period = win === "24h" ? "in the last 24 hours" : "over the last 7 days";
  if (lens === "wallet") {
    const top10 = rows.slice(0, 10).reduce((s, r) => s + (metric === "volume" ? r.volumeShare : r.countShare), 0);
    return `The ten most active wallets made up ${formatShare(top10)} ${what} ${period}.`;
  }
  if (lens === "action") return `${top.label} made up ${share} ${what} ${period}.`;
  return `${top.label} took ${share} ${what} ${period}.`;
}

export function LensPanel({ data }: { data: LensData }) {
  const [lens, setLens] = useState<LensKey>("token");
  const [win, setWin] = useState<"24h" | "7d">("7d");
  const [metric, setMetric] = useState<"volume" | "count">("volume");

  const slice = data[win][lens];
  const shareOf = (r: BreakdownRow) => (metric === "volume" ? r.volumeShare : r.countShare);
  const rows = [...slice.rows].sort((a, b) => (metric === "volume" ? b.volume - a.volume : b.count - a.count));
  const shown = rows.slice(0, TOP);
  const restCount = slice.totalRows - shown.length;
  const restShare = Math.max(0, 1 - shown.reduce((s, r) => s + shareOf(r), 0));
  const max = Math.max(...shown.map(shareOf), 0.0001);

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="lens-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-md">
          <h2 id="lens-title" className="font-display text-2xl font-semibold tracking-tight sm:text-[28px]">
            Where the trading happens
          </h2>
          <p className="mt-1.5 text-[15px] leading-relaxed text-slate">
            Swap activity across every gToken, sliced five ways. Switch the lens to see who and what drives the market.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Time window"
            size="sm"
            value={win}
            onChange={setWin}
            options={[
              { value: "24h", label: "24h" },
              { value: "7d", label: "7 days" },
            ]}
          />
          <Segmented
            label="Measure"
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "volume", label: "Volume" },
              { value: "count", label: "Trades" },
            ]}
          />
        </div>
      </div>

      <div className="mt-6 overflow-x-auto pb-1">
        <Segmented label="Lens" value={lens} onChange={setLens} options={LENSES} />
      </div>

      <p className="mt-5 text-[15px] font-medium text-graphite" aria-live="polite">
        {insight(rows, lens, metric, win)}
      </p>

      <ol className="mt-4 divide-y divide-hairline">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((r, i) => {
            const share = metric === "volume" ? r.volumeShare : r.countShare;
            return (
              <motion.li
                key={`${lens}-${r.key}`}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-center gap-x-3 py-3 sm:grid-cols-[1.5rem_minmax(0,14rem)_minmax(0,1fr)_7.5rem]"
              >
                <span className="tabular text-sm text-slate">{i + 1}</span>
                <RowLabel row={r} />
                <div className="col-span-3 col-start-2 row-start-2 mt-2 h-2 rounded-full bg-muted sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:mt-0">
                  <motion.div
                    className={cn("h-full rounded-full", i === 0 ? "bg-gold" : "bg-graphite/80")}
                    initial={false}
                    animate={{ width: `${Math.max(1.5, (share / max) * 100)}%` }}
                    transition={{ type: "spring", stiffness: 140, damping: 22 }}
                  />
                </div>
                <div className="text-right">
                  <div className="tabular text-sm font-semibold">
                    {metric === "volume" ? formatUsd(r.volume, { compact: true }) : formatNumber(r.count)}
                  </div>
                  <div className="tabular text-xs text-slate">
                    {formatShare(share)}
                    {lens !== "action" && metric === "volume" && r.count > 0 ? `, avg ${formatUsd(r.avg)}` : ""}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ol>
      {restCount > 0 && (
        <p className="mt-3 text-sm text-slate">
          {formatNumber(restCount)} more {LENSES.find((l) => l.value === lens)!.noun}
          {restCount === 1 ? "" : "s"} share the remaining {formatShare(restShare)}.
        </p>
      )}
    </section>
  );
}

function RowLabel({ row }: { row: BreakdownRow }) {
  const body = (
    <span className="flex min-w-0 items-center gap-3">
      {row.image && (
        <span className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-muted">
          <Image src={row.image} alt="" fill sizes="36px" className="object-cover" />
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-medium">{row.label}</span>
        {row.sublabel && <span className="block truncate text-xs text-slate">{row.sublabel}</span>}
      </span>
    </span>
  );
  return row.href ? (
    <Link href={row.href} className="min-w-0 rounded-lg hover:text-gold-ink">
      {body}
    </Link>
  ) : (
    body
  );
}

"use client";

import { useState } from "react";
import type { LeaderboardMetric, LeaderboardPeriod } from "@/lib/grail/types";
import { formatDate, formatUsd } from "@/lib/format";
import { explorerAddress } from "@/lib/grail/meta";
import { shortAddress } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { Segmented } from "./segmented";

export interface BoardRow {
  rank: number;
  name: string | null;
  wallet: string;
  isGrailUser: boolean;
  realized: number;
  unrealized: number;
  total: number;
}

export type Boards = Record<LeaderboardPeriod, Record<LeaderboardMetric, { snapshotAt: string; rows: BoardRow[] } | null>>;

export function TradersBoard({ boards }: { boards: Boards }) {
  const [period, setPeriod] = useState<LeaderboardPeriod>("all_time");
  const [metric, setMetric] = useState<LeaderboardMetric>("total");
  const board = boards[period][metric];
  const valueOf = (r: BoardRow) => r[metric];
  const winners = board?.rows.filter((r) => valueOf(r) > 0).length ?? 0;

  return (
    <section className="panel p-4 sm:p-6" aria-labelledby="board-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="board-title" className="font-display text-xl font-semibold tracking-tight">
          Profit and loss leaderboard
        </h2>
        <div className="flex flex-wrap gap-2">
          <Segmented
            label="Period"
            size="sm"
            value={period}
            onChange={setPeriod}
            options={[
              { value: "all_time", label: "All time" },
              { value: "24h", label: "Last 24h" },
            ]}
          />
          <Segmented
            label="Ranked by"
            size="sm"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "total", label: "Total" },
              { value: "realized", label: "Realized" },
              { value: "unrealized", label: "Unrealized" },
            ]}
          />
        </div>
      </div>

      {!board ? (
        <p className="py-16 text-center text-sm text-slate">This leaderboard didn&apos;t load. It will retry on the next refresh.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate">
            {winners === board.rows.length
              ? `Every wallet in the top ${winners} is in profit.`
              : `${winners} of the top ${board.rows.length} wallets are in profit.`}{" "}
            Snapshot from {formatDate(board.snapshotAt)},{" "}
            {new Date(board.snapshotAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC.
          </p>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-slate">
                  <th className="w-10 py-2.5 font-medium">Rank</th>
                  <th className="py-2.5 font-medium">Trader</th>
                  <th className="py-2.5 text-right font-medium">Realized</th>
                  <th className="py-2.5 text-right font-medium">Unrealized</th>
                  <th className="py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {board.rows.map((r) => (
                  <tr key={`${r.rank}-${r.wallet}`} className="hover:bg-mist/70">
                    <td className="tabular py-3 text-slate">
                      {r.rank <= 3 ? (
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-gold-wash text-xs font-semibold text-gold-ink">
                          {r.rank}
                        </span>
                      ) : (
                        r.rank
                      )}
                    </td>
                    <td className="py-3">
                      <a href={explorerAddress(8453, r.wallet)} target="_blank" rel="noreferrer" className="group">
                        <span className="block font-medium group-hover:text-gold-ink">{r.name ?? shortAddress(r.wallet)}</span>
                        {(r.name || !r.isGrailUser) && (
                          <span className="block text-xs text-slate">
                            {[r.name && shortAddress(r.wallet), !r.isGrailUser && "No Grail account"].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </a>
                    </td>
                    <Pnl value={r.realized} dim={metric === "unrealized"} />
                    <Pnl value={r.unrealized} dim={metric === "realized"} />
                    <Pnl value={r.total} strong />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function Pnl({ value, strong, dim }: { value: number; strong?: boolean; dim?: boolean }) {
  return (
    <td
      className={cn(
        "tabular py-3 text-right",
        strong && "font-semibold",
        dim && "opacity-60",
        value > 0 ? "text-up" : value < 0 ? "text-down" : "text-slate",
      )}
    >
      {value > 0 ? "+" : ""}
      {formatUsd(value, { compact: true })}
    </td>
  );
}

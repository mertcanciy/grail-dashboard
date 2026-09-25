import type { Metadata } from "next";
import { getLeaderboard } from "@/lib/grail/api";
import type { LeaderboardMetric, LeaderboardPeriod } from "@/lib/grail/types";
import { getMarketSnapshot } from "@/lib/market";
import { formatNumber, formatUsd } from "@/lib/format";
import { TradersBoard, type Boards } from "@/components/traders-board";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Traders",
  description: "Grail's profit and loss leaderboard, plus the biggest gToken buyers this week.",
};

const PERIODS: LeaderboardPeriod[] = ["all_time", "24h"];
const METRICS: LeaderboardMetric[] = ["total", "realized", "unrealized"];

/** All six leaderboard views are prerendered together so switching tabs is instant and the page stays static. */
async function loadBoards() {
  let totalEntries = 0;
  const entries = await Promise.all(
    PERIODS.flatMap((period) =>
      METRICS.map(async (metric) => {
        try {
          const b = await getLeaderboard(period, metric, 50);
          if (period === "all_time" && metric === "total") totalEntries = b.total_entries;
          return [period, metric, {
            snapshotAt: b.snapshot_at,
            rows: b.entries.map((e) => ({
              rank: e.rank,
              name: e.username,
              wallet: e.wallet_address,
              isGrailUser: e.is_grail_user,
              realized: Number(e.realized_pnl_usdc),
              unrealized: Number(e.unrealized_pnl_usdc),
              total: Number(e.total_pnl_usdc),
            })),
          }] as const;
        } catch {
          return [period, metric, null] as const;
        }
      }),
    ),
  );
  const boards = { all_time: {}, "24h": {} } as Boards;
  for (const [p, m, b] of entries) boards[p][m] = b;
  return { boards, totalEntries };
}

export default async function TradersPage() {
  const [{ boards, totalEntries }, snap] = await Promise.all([loadBoards(), getMarketSnapshot()]);

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
      <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Traders</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate">
        Grail ranks {totalEntries ? `${formatNumber(totalEntries)} wallets` : "wallets"} by profit and loss in USDC. Realized is locked in by selling; unrealized is what open positions are up or down at
        today&apos;s prices.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <TradersBoard boards={boards} />

        <aside className="panel h-fit p-5 sm:p-6" aria-labelledby="buyers-title">
          <h2 id="buyers-title" className="font-display text-xl font-semibold tracking-tight">
            Biggest buyers, 7 days
          </h2>
          <p className="mt-1 text-sm text-slate">Wallets that put the most dollars into gTokens this week.</p>
          <ol className="mt-4 space-y-3">
            {snap.topBuyers.map((b, i) => (
              <li key={b.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="tabular w-5 text-slate">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{b.label}</span>
                    <span className="block text-xs text-slate">
                      {formatNumber(b.count)} buys, avg {formatUsd(b.avg)}
                    </span>
                  </span>
                </span>
                <span className="tabular font-semibold">{formatUsd(b.volume, { compact: true })}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </div>
  );
}

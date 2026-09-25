import type { Metadata } from "next";
import Link from "next/link";
import { getLeaderboard, getMarketActivity, getTokens } from "@/lib/grail/api";
import type { LeaderboardMetric, LeaderboardPeriod } from "@/lib/grail/types";
import { breakdown, isTrade, shortAddress } from "@/lib/metrics";
import { formatDate, formatNumber, formatUsd } from "@/lib/format";
import { explorerAddress } from "@/lib/grail/meta";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Traders",
  description: "Grail's profit and loss leaderboard, plus the biggest gToken buyers this week.",
};

const PERIODS: { value: LeaderboardPeriod; label: string }[] = [
  { value: "all_time", label: "All time" },
  { value: "24h", label: "Last 24h" },
];
const METRICS: { value: LeaderboardMetric; label: string }[] = [
  { value: "total", label: "Total" },
  { value: "realized", label: "Realized" },
  { value: "unrealized", label: "Unrealized" },
];

function pick<T extends string>(v: string | string[] | undefined, allowed: readonly { value: T }[], fallback: T): T {
  const s = Array.isArray(v) ? v[0] : v;
  return allowed.find((a) => a.value === s)?.value ?? fallback;
}

export default async function TradersPage(props: PageProps<"/traders">) {
  const sp = await props.searchParams;
  const period = pick(sp.period, PERIODS, "all_time");
  const metric = pick(sp.metric, METRICS, "total");

  const [board, { tokens }] = await Promise.all([getLeaderboard(period, metric, 50), getTokens({ timeframe: "1d", windowDays: 1 })]);
  const { events } = await getMarketActivity(tokens, 7);
  const buyers = breakdown(
    events.filter((e) => isTrade(e) && e.type === "BUY"),
    (e) => e.address.toLowerCase(),
  ).slice(0, 10);
  const names = new Map(events.map((e) => [e.address.toLowerCase(), e.username ?? e.display_name]));

  const valueOf = (e: (typeof board.entries)[number]) =>
    Number(metric === "realized" ? e.realized_pnl_usdc : metric === "unrealized" ? e.unrealized_pnl_usdc : e.total_pnl_usdc);
  const winners = board.entries.filter((e) => valueOf(e) > 0).length;

  const href = (p: LeaderboardPeriod, m: LeaderboardMetric) => `/traders?period=${p}&metric=${m}`;

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
      <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Traders</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate">
        Grail ranks {formatNumber(board.total_entries)} wallets by profit and loss in USDC. Realized is locked in by
        selling; unrealized is what open positions are up or down at today&apos;s prices.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section className="panel p-4 sm:p-6" aria-labelledby="board-title">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 id="board-title" className="font-display text-xl font-semibold tracking-tight">
              Profit and loss leaderboard
            </h2>
            <div className="flex flex-wrap gap-2">
              <LinkTabs items={PERIODS.map((p) => ({ label: p.label, href: href(p.value, metric), active: p.value === period }))} label="Period" />
              <LinkTabs items={METRICS.map((m) => ({ label: m.label, href: href(period, m.value), active: m.value === metric }))} label="Metric" />
            </div>
          </div>
          <p className="mt-2 text-sm text-slate">
            {winners === board.entries.length
              ? `Every wallet in the top ${winners} is in profit.`
              : `${winners} of the top ${board.entries.length} wallets are in profit.`}{" "}
            Snapshot from {formatDate(board.snapshot_at)},{" "}
            {new Date(board.snapshot_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC.
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
                {board.entries.map((e) => (
                  <tr key={`${e.rank}-${e.wallet_address}`} className="hover:bg-mist/70">
                    <td className="tabular py-3 text-slate">
                      {e.rank <= 3 ? (
                        <span className="inline-flex size-6 items-center justify-center rounded-full bg-gold-wash text-xs font-semibold text-gold-ink">
                          {e.rank}
                        </span>
                      ) : (
                        e.rank
                      )}
                    </td>
                    <td className="py-3">
                      <a href={explorerAddress(8453, e.wallet_address)} target="_blank" rel="noreferrer" className="group">
                        <span className="block font-medium group-hover:text-gold-ink">
                          {e.username ?? shortAddress(e.wallet_address)}
                        </span>
                        {(e.username || !e.is_grail_user) && (
                          <span className="block text-xs text-slate">
                            {[e.username && shortAddress(e.wallet_address), !e.is_grail_user && "No Grail account"].filter(Boolean).join(", ")}
                          </span>
                        )}
                      </a>
                    </td>
                    <Pnl value={Number(e.realized_pnl_usdc)} dim={metric !== "realized" && metric !== "total"} />
                    <Pnl value={Number(e.unrealized_pnl_usdc)} dim={metric !== "unrealized" && metric !== "total"} />
                    <Pnl value={Number(e.total_pnl_usdc)} strong />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel h-fit p-5 sm:p-6" aria-labelledby="buyers-title">
          <h2 id="buyers-title" className="font-display text-xl font-semibold tracking-tight">
            Biggest buyers, 7 days
          </h2>
          <p className="mt-1 text-sm text-slate">Wallets that put the most dollars into gTokens this week.</p>
          <ol className="mt-4 space-y-3">
            {buyers.map((b, i) => (
              <li key={b.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-3">
                  <span className="tabular w-5 text-slate">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{names.get(b.key) ?? shortAddress(b.key)}</span>
                    <span className="block text-xs text-slate">{formatNumber(b.count)} buys, avg {formatUsd(b.avg)}</span>
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

function LinkTabs({ items, label }: { items: { label: string; href: string; active: boolean }[]; label: string }) {
  return (
    <nav aria-label={label} className="inline-flex rounded-full bg-muted p-1">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          scroll={false}
          aria-current={it.active ? "page" : undefined}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
            it.active ? "bg-paper text-graphite shadow-[0_1px_2px_rgb(23_25_30/0.08),0_0_0_1px_var(--hairline)]" : "text-slate hover:text-graphite",
          )}
        >
          {it.label}
        </Link>
      ))}
    </nav>
  );
}

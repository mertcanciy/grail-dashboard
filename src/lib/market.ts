import { unstable_cache } from "next/cache";
import { getMarketActivity, getTokens } from "./grail/api";
import { personName, slugOf, ticker } from "./grail/meta";
import {
  DAY_MS,
  activityHeatmap,
  breakdown,
  buySizeHistogram,
  isTrade,
  marketLenses,
  shortAddress,
  since,
  summarizeTrades,
  trimLenses,
} from "./metrics";
import { formatUsd } from "./format";

export const SNAPSHOT_REVALIDATE = 300;

/**
 * Walking a week of activity for every gToken takes dozens of API calls. Do it once per window and cache only
 * the aggregates (well under the 2 MB data-cache limit), so every page that needs market-wide numbers shares
 * one result instead of re-walking the pages. New tokens are picked up automatically because the token list
 * is re-read on every rebuild of the snapshot.
 */
export const getMarketSnapshot = unstable_cache(
  async () => {
    const { tokens } = await getTokens({ timeframe: "1h", windowDays: 7 });
    const { events } = await getMarketActivity(tokens, 7);
    const now = Date.now();

    const trades = events.filter(isTrade);
    const buys = trades.filter((e) => e.type === "BUY");
    const summary = summarizeTrades(trades);
    const bySymbol = new Map(tokens.map((t) => [t.symbol, t]));

    const avgBuyByToken = breakdown(buys, (e) => e.symbol, (key) => {
      const t = bySymbol.get(key);
      return t ? { label: ticker(t), sublabel: personName(t), href: `/tokens/${slugOf(t)}` } : { label: key };
    })
      .filter((r) => r.count >= 5)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10);

    const names = new Map<string, string>();
    for (const e of trades) {
      const k = e.address.toLowerCase();
      if (!names.has(k) || e.username) names.set(k, e.username ?? e.display_name);
    }
    const topBuyers = breakdown(buys, (e) => e.address.toLowerCase(), (key) => ({
      label: names.get(key) ?? shortAddress(key),
    })).slice(0, 10);

    const largest = summary.largestBuy && "symbol" in summary.largestBuy ? summary.largestBuy : null;
    const largestToken = largest ? bySymbol.get(largest.symbol) : undefined;

    return {
      computedAt: now,
      summary,
      lenses: {
        "24h": trimLenses(marketLenses(since(events, DAY_MS, now), tokens)),
        "7d": trimLenses(marketLenses(events, tokens)),
      },
      histogram: buySizeHistogram(trades),
      avgBuyByToken,
      topBuyers,
      largestBuyLabel: largest
        ? `${formatUsd(Number(largest.usd_value))} of ${largestToken ? ticker(largestToken) : largest.symbol}`
        : null,
      heatmap: activityHeatmap(trades),
      latest: trades.slice(0, 14),
    };
  },
  ["market-snapshot-v1"],
  { revalidate: SNAPSHOT_REVALIDATE, tags: ["grail", "market"] },
);

export type MarketSnapshot = Awaited<ReturnType<typeof getMarketSnapshot>>;

import { getMarketActivity, getTokens } from "./grail/api";
import { personName, slugOf, ticker, vaultedItems } from "./grail/meta";
import {
  DAY_MS,
  activityHeatmap,
  breakdown,
  buySizeHistogram,
  isTrade,
  marketLenses,
  since,
  summarizeTrades,
  trimLenses,
} from "./metrics";
import { formatUsd } from "./format";

export async function loadOverview() {
  const { tokens, totalMarketCap } = await getTokens({ timeframe: "1h", windowDays: 7 });
  const { events } = await getMarketActivity(tokens, 7);
  const now = Date.now();

  const trades = events.filter(isTrade);
  const day = since(events, DAY_MS, now);
  const summary = summarizeTrades(trades);
  const bySymbol = new Map(tokens.map((t) => [t.symbol, t]));

  const avgBuyByToken = breakdown(
    trades.filter((e) => e.type === "BUY"),
    (e) => e.symbol,
    (key) => {
      const t = bySymbol.get(key);
      return t ? { label: ticker(t), sublabel: personName(t), href: `/tokens/${slugOf(t)}` } : { label: key };
    },
  )
    .filter((r) => r.count >= 5)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 10);

  const largest = summary.largestBuy && "symbol" in summary.largestBuy ? summary.largestBuy : null;
  const largestToken = largest ? bySymbol.get(largest.symbol) : undefined;

  const priced = tokens.filter((t) => !t.unpriced && t.market_price);
  const byChange = [...priced].sort((a, b) => Number(b.price_change_24h_percent) - Number(a.price_change_24h_percent));

  return {
    now,
    tokens,
    kpis: {
      marketCap: totalMarketCap,
      volume24h: tokens.reduce((s, t) => s + Number(t.volume_24h || 0), 0),
      trades7d: summary.trades,
      avgBuy7d: summary.avgBuy,
      traders7d: summary.uniqueTraders,
      vaulted: tokens.reduce((s, t) => s + vaultedItems(t).total, 0),
    },
    lenses: { "24h": trimLenses(marketLenses(day, tokens)), "7d": trimLenses(marketLenses(events, tokens)) },
    summary,
    histogram: buySizeHistogram(trades),
    avgBuyByToken,
    largestBuyLabel: largest ? `${formatUsd(Number(largest.usd_value))} of ${largestToken ? ticker(largestToken) : largest.symbol}` : null,
    heatmap: activityHeatmap(trades),
    gainers: byChange.filter((t) => Number(t.price_change_24h_percent) > 0).slice(0, 5),
    losers: byChange.filter((t) => Number(t.price_change_24h_percent) < 0).reverse().slice(0, 5),
    mostTraded: [...priced].sort((a, b) => Number(b.volume_24h) - Number(a.volume_24h)).slice(0, 5),
    latest: trades.slice(0, 14),
  };
}

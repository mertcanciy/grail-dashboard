import { getTokens } from "./grail/api";
import { vaultedItems } from "./grail/meta";
import { getMarketSnapshot } from "./market";

/** Prices and 24h figures come from the token list (fresh every 2 min); flow metrics from the shared snapshot. */
export async function loadOverview() {
  const [{ tokens, totalMarketCap }, snap] = await Promise.all([
    getTokens({ timeframe: "1h", windowDays: 7 }),
    getMarketSnapshot(),
  ]);
  const now = Date.now();

  const priced = tokens.filter((t) => !t.unpriced && t.market_price);
  const byChange = [...priced].sort((a, b) => Number(b.price_change_24h_percent) - Number(a.price_change_24h_percent));

  return {
    now,
    tokens,
    kpis: {
      marketCap: totalMarketCap,
      volume24h: tokens.reduce((s, t) => s + Number(t.volume_24h || 0), 0),
      trades7d: snap.summary.trades,
      avgBuy7d: snap.summary.avgBuy,
      traders7d: snap.summary.uniqueTraders,
      vaulted: tokens.reduce((s, t) => s + vaultedItems(t).total, 0),
    },
    lenses: snap.lenses,
    summary: snap.summary,
    histogram: snap.histogram,
    avgBuyByToken: snap.avgBuyByToken,
    largestBuyLabel: snap.largestBuyLabel,
    heatmap: snap.heatmap,
    gainers: byChange.filter((t) => Number(t.price_change_24h_percent) > 0).slice(0, 5),
    losers: byChange.filter((t) => Number(t.price_change_24h_percent) < 0).reverse().slice(0, 5),
    mostTraded: [...priced].sort((a, b) => Number(b.volume_24h) - Number(a.volume_24h)).slice(0, 5),
    latest: snap.latest,
  };
}

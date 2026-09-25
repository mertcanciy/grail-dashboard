import type { Metadata } from "next";
import { clipToWindow, getHolderCounts, getTokens } from "@/lib/grail/api";
import { categoryOf, imageOf, chainOf, personName, quoteAssetOf, slugOf, ticker, tokensPerItem, vaultedItems } from "@/lib/grail/meta";
import { itemValue } from "@/lib/metrics";
import { formatNumber, formatUsd } from "@/lib/format";
import type { Candle } from "@/lib/grail/types";
import { TokenTable, type TokenRow } from "@/components/token-table";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "All gTokens",
  description: "Every Grail gToken with price, volume, holders and the cost of one full vaulted item.",
};

function downsample(candles: Candle[], n = 42) {
  if (candles.length <= n) return candles;
  const step = candles.length / n;
  return Array.from({ length: n }, (_, i) => candles[Math.floor(i * step)]).concat([candles[candles.length - 1]]);
}

export default async function TokensPage() {
  const { tokens, totalMarketCap } = await getTokens({ timeframe: "1h", windowDays: 7 });
  const holders = await getHolderCounts(tokens);

  const rows: TokenRow[] = tokens.map((t) => ({
    slug: slugOf(t),
    ticker: ticker(t),
    person: personName(t),
    image: imageOf(t),
    category: categoryOf(t),
    chain: chainOf(t.chain_id).name,
    quote: quoteAssetOf(t),
    price: t.market_price,
    change1h: Number(t.price_change_1h_percent),
    change24h: Number(t.price_change_24h_percent),
    change7d: Number(t.price_change_7d_percent),
    marketCap: Number(t.market_cap),
    volume24h: Number(t.volume_24h),
    holders: holders[t.symbol] ?? null,
    vaulted: vaultedItems(t).total,
    itemValue: itemValue(t.market_price, tokensPerItem(t)),
    listed: t.created_at,
    spark: downsample(clipToWindow(t.ohlcv_list ?? [], 7)),
  }));

  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
  const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([c]) => c);
  const totalHolders = Object.values(holders).reduce<number>((s, v) => s + (v ?? 0), 0);

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
      <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">All gTokens</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate">
        {tokens.length} legends worth {formatUsd(totalMarketCap, { compact: true })} combined, across{" "}
        {formatNumber(totalHolders)} holder positions. &ldquo;One item&rdquo; is what it costs today to collect enough
        tokens to redeem a single vaulted piece.
      </p>
      <div className="mt-8">
        <TokenTable rows={rows} categories={categories} />
      </div>
    </div>
  );
}

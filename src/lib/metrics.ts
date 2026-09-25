import type { Activity, GrailToken, Holder, TokenActivity } from "./grail/types";
import { categoryOf, chainOf, imageOf, personName, quoteAssetOf, ticker } from "./grail/meta";

export const HOUR_MS = 3_600_000;
export const DAY_MS = 86_400_000;

export const usd = (a: Pick<Activity, "usd_value">) => {
  const v = Number(a.usd_value ?? 0);
  return Number.isFinite(v) ? v : 0;
};

export const isTrade = (a: Pick<Activity, "type">) => a.type === "BUY" || a.type === "SELL";

export function since<T extends Pick<Activity, "block_timestamp">>(events: T[], ms: number, now = Date.now()) {
  const cutoff = now - ms;
  return events.filter((e) => Date.parse(e.block_timestamp) >= cutoff);
}

export function median(values: number[]) {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface TradeSummary {
  trades: number;
  buys: number;
  sells: number;
  volume: number;
  buyVolume: number;
  sellVolume: number;
  netFlow: number;
  avgBuy: number;
  medianBuy: number;
  avgSell: number;
  avgTrade: number;
  uniqueTraders: number;
  uniqueBuyers: number;
  largestBuy: TokenActivity | Activity | null;
  buyShare: number;
}

export function summarizeTrades<T extends Activity>(events: T[]): TradeSummary {
  const buys = events.filter((e) => e.type === "BUY");
  const sells = events.filter((e) => e.type === "SELL");
  const buyValues = buys.map(usd);
  const buyVolume = buyValues.reduce((s, v) => s + v, 0);
  const sellVolume = sells.reduce((s, e) => s + usd(e), 0);
  const trades = buys.length + sells.length;
  const volume = buyVolume + sellVolume;
  const traders = new Set([...buys, ...sells].map((e) => e.address.toLowerCase()));
  const buyers = new Set(buys.map((e) => e.address.toLowerCase()));
  const largestBuy = buys.reduce<T | null>((best, e) => (!best || usd(e) > usd(best) ? e : best), null);
  return {
    trades,
    buys: buys.length,
    sells: sells.length,
    volume,
    buyVolume,
    sellVolume,
    netFlow: buyVolume - sellVolume,
    avgBuy: buys.length ? buyVolume / buys.length : 0,
    medianBuy: median(buyValues),
    avgSell: sells.length ? sellVolume / sells.length : 0,
    avgTrade: trades ? volume / trades : 0,
    uniqueTraders: traders.size,
    uniqueBuyers: buyers.size,
    largestBuy,
    buyShare: volume ? buyVolume / volume : 0,
  };
}

export const BUY_BUCKETS = [
  { label: "Under $10", max: 10 },
  { label: "$10–50", max: 50 },
  { label: "$50–250", max: 250 },
  { label: "$250–1k", max: 1_000 },
  { label: "$1k–5k", max: 5_000 },
  { label: "$5k+", max: Infinity },
] as const;

export function buySizeHistogram(events: Activity[]) {
  const counts = BUY_BUCKETS.map((b) => ({ label: b.label, count: 0, volume: 0 }));
  for (const e of events) {
    if (e.type !== "BUY") continue;
    const v = usd(e);
    const i = BUY_BUCKETS.findIndex((b) => v < b.max);
    counts[i].count++;
    counts[i].volume += v;
  }
  const total = counts.reduce((s, c) => s + c.count, 0);
  return counts.map((c) => ({ ...c, share: total ? c.count / total : 0 }));
}

export interface BreakdownRow {
  key: string;
  label: string;
  sublabel?: string;
  href?: string;
  image?: string;
  volume: number;
  count: number;
  volumeShare: number;
  countShare: number;
  avg: number;
}

type Describe = (key: string) => Pick<BreakdownRow, "label" | "sublabel" | "href" | "image">;

export function breakdown<T extends Activity>(
  events: T[],
  keyOf: (e: T) => string | null,
  describe: Describe = (key) => ({ label: key }),
): BreakdownRow[] {
  const acc = new Map<string, { volume: number; count: number }>();
  for (const e of events) {
    const k = keyOf(e);
    if (k == null) continue;
    const row = acc.get(k) ?? { volume: 0, count: 0 };
    row.volume += usd(e);
    row.count++;
    acc.set(k, row);
  }
  const totalVolume = [...acc.values()].reduce((s, r) => s + r.volume, 0);
  const totalCount = [...acc.values()].reduce((s, r) => s + r.count, 0);
  return [...acc.entries()]
    .map(([key, r]) => ({
      key,
      ...describe(key),
      volume: r.volume,
      count: r.count,
      volumeShare: totalVolume ? r.volume / totalVolume : 0,
      countShare: totalCount ? r.count / totalCount : 0,
      avg: r.count ? r.volume / r.count : 0,
    }))
    .sort((a, b) => b.volume - a.volume || b.count - a.count);
}

export const ACTION_GROUPS: Record<string, { key: string; label: string; sublabel: string }> = {
  BUY: { key: "buy", label: "Buys", sublabel: "Swaps into a gToken" },
  SELL: { key: "sell", label: "Sells", sublabel: "Swaps out of a gToken" },
  LP_ADD: { key: "lp", label: "Liquidity", sublabel: "Earn-fees deposits, withdrawals and fee claims" },
  LP_REMOVE: { key: "lp", label: "Liquidity", sublabel: "Earn-fees deposits, withdrawals and fee claims" },
  LP_FEE_COLLECT: { key: "lp", label: "Liquidity", sublabel: "Earn-fees deposits, withdrawals and fee claims" },
  PACK_CLAIM: { key: "pack-claim", label: "Pack claims", sublabel: "gTokens redeemed from opened packs" },
  PACK_NFT_BUY: { key: "pack-nft", label: "Pack NFT trades", sublabel: "Pack NFTs bought, sold and transferred" },
  PACK_NFT_SELL: { key: "pack-nft", label: "Pack NFT trades", sublabel: "Pack NFTs bought, sold and transferred" },
  PACK_NFT_TRANSFER_IN: { key: "pack-nft", label: "Pack NFT trades", sublabel: "Pack NFTs bought, sold and transferred" },
  PACK_NFT_TRANSFER_OUT: { key: "pack-nft", label: "Pack NFT trades", sublabel: "Pack NFTs bought, sold and transferred" },
};

export type LensKey = "token" | "category" | "venue" | "action" | "wallet";

export function marketLenses(events: TokenActivity[], tokens: GrailToken[]) {
  const bySymbol = new Map(tokens.map((t) => [t.symbol, t]));
  const trades = events.filter(isTrade);

  const token = breakdown(trades, (e) => e.symbol, (key) => {
    const t = bySymbol.get(key);
    return t
      ? { label: ticker(t), sublabel: personName(t), href: `/tokens/${key.toLowerCase()}`, image: imageOf(t) }
      : { label: key };
  });

  const category = breakdown(trades, (e) => {
    const t = bySymbol.get(e.symbol);
    return t ? categoryOf(t) : null;
  }, (key) => {
    const members = tokens.filter((t) => categoryOf(t) === key).map(ticker);
    return { label: key, sublabel: members.slice(0, 4).join(", ") + (members.length > 4 ? ` +${members.length - 4}` : "") };
  });

  const venue = breakdown(trades, (e) => {
    const t = bySymbol.get(e.symbol);
    return t ? `${t.chain_id}:${quoteAssetOf(t)}` : null;
  }, (key) => {
    const [chain, quote] = key.split(":");
    const members = tokens.filter((t) => `${t.chain_id}:${quoteAssetOf(t)}` === key).map(ticker);
    return {
      label: `${chainOf(Number(chain)).name}, ${quote} pools`,
      sublabel: members.length > 3 ? `${members.length} gTokens` : members.join(", "),
    };
  });

  const action = breakdown(events, (e) => ACTION_GROUPS[e.type]?.key ?? "other", (key) => {
    const g = Object.values(ACTION_GROUPS).find((x) => x.key === key);
    return g ? { label: g.label, sublabel: g.sublabel } : { label: "Other" };
  });

  const names = new Map<string, string>();
  for (const e of trades) {
    const k = e.address.toLowerCase();
    if (!names.has(k) || e.username) names.set(k, e.username ?? e.display_name);
  }
  const wallet = breakdown(trades, (e) => e.address.toLowerCase(), (key) => ({
    label: names.get(key) ?? shortAddress(key),
    sublabel: shortAddress(key),
  }));

  return { token, category, venue, action, wallet } satisfies Record<LensKey, BreakdownRow[]>;
}

export interface LensSlice {
  rows: BreakdownRow[];
  totalRows: number;
}

/** Keep only rows that can appear in a top-N list by either volume or count, so the client payload stays small. */
export function trimLens(rows: BreakdownRow[], n = 12): LensSlice {
  const byCount = [...rows].sort((a, b) => b.count - a.count).slice(0, n);
  const keep = new Map(rows.slice(0, n).map((r) => [r.key, r]));
  for (const r of byCount) keep.set(r.key, r);
  return { rows: [...keep.values()], totalRows: rows.length };
}

export function trimLenses(lenses: Record<LensKey, BreakdownRow[]>, n = 12) {
  return Object.fromEntries(Object.entries(lenses).map(([k, v]) => [k, trimLens(v, n)])) as Record<LensKey, LensSlice>;
}

/** 7×24 grid of trade counts by UTC weekday (Mon = 0) and hour. */
export function activityHeatmap(events: Activity[]) {
  const grid = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => ({ count: 0, volume: 0 })));
  for (const e of events) {
    if (!isTrade(e)) continue;
    const d = new Date(e.block_timestamp);
    const day = (d.getUTCDay() + 6) % 7;
    const cell = grid[day][d.getUTCHours()];
    cell.count++;
    cell.volume += usd(e);
  }
  const max = Math.max(1, ...grid.flat().map((c) => c.count));
  return { grid, max };
}

export function dailyFlow(events: Activity[], days: number, now = Date.now()) {
  const end = Math.floor(now / DAY_MS) * DAY_MS;
  const rows = Array.from({ length: days }, (_, i) => ({ day: end - (days - 1 - i) * DAY_MS, buy: 0, sell: 0, trades: 0 }));
  const start = rows[0].day;
  for (const e of events) {
    if (!isTrade(e)) continue;
    const idx = Math.floor((Date.parse(e.block_timestamp) - start) / DAY_MS);
    if (idx < 0 || idx >= days) continue;
    rows[idx][e.type === "BUY" ? "buy" : "sell"] += usd(e);
    rows[idx].trades++;
  }
  return rows;
}

export function holderConcentration(holders: Pick<Holder, "percentage">[]) {
  const pct = holders.map((h) => Number(h.percentage) / 100).filter(Number.isFinite).sort((a, b) => b - a);
  const sum = (n: number) => pct.slice(0, n).reduce((s, v) => s + v, 0);
  return { top1: sum(1), top10: sum(10), top50: sum(50) };
}

export function shortAddress(addr: string, head = 6, tail = 4) {
  return addr.length > head + tail + 2 ? `${addr.slice(0, head)}…${addr.slice(-tail)}` : addr;
}

/** Cost in USD to assemble enough gTokens to redeem one physical item. */
export function itemValue(price: number | null, tokensPerItem: number) {
  return (price ?? 0) * tokensPerItem;
}

import { cache } from "react";
import { clipToWindow, getActivityWindow, getHolders, getToken, getTokenVault, MAX_ACTIVITY_PAGES } from "./grail/api";
import { isGrailWallet, tokensPerItem, vaultedItems } from "./grail/meta";
import {
  dailyFlow,
  holderConcentration,
  isTrade,
  itemValue,
  redeemCandidates,
  summarizeTrades,
  supplyBacking,
} from "./metrics";
import { getItemQuote } from "./quotes";

/** Grail symbols are inconsistent ("gYAMAL" but "JENSEN"), so accept a URL with or without the leading "g". */
function alternateSymbol(symbol: string) {
  return /^g[a-z0-9]/i.test(symbol) ? symbol.slice(1) : `g${symbol}`;
}

export const loadToken = cache(async (symbol: string) => {
  const opts = { timeframe: "1h", windowDays: 7 } as const;
  const token = (await getToken(symbol, opts)) ?? (await getToken(alternateSymbol(symbol), opts));
  if (!token) return null;
  const [activity, holders, vault, quote] = await Promise.all([
    getActivityWindow(token.symbol, 7, MAX_ACTIVITY_PAGES, token).catch(() => null),
    getHolders(token.symbol, 50).catch(() => null),
    getTokenVault(token),
    getItemQuote(token.symbol).catch(() => null),
  ]);
  const now = Date.now();
  const events = activity?.events ?? [];
  const trades = events.filter(isTrade);
  const perItem = tokensPerItem(token);
  const pop = token.reserves.reduce((s, r) => s + (r.psa_pop || 0), 0);
  const holderRows = holders?.results ?? [];
  const collectorRows = holderRows.filter((h) => !isGrailWallet(h.username ?? h.display_name));
  const grailShare = holderRows
    .filter((h) => isGrailWallet(h.username ?? h.display_name))
    .reduce((s, h) => s + Number(h.percentage) / 100, 0);

  return {
    now,
    token,
    candles7d: clipToWindow(token.ohlcv_list ?? [], 7),
    summary: summarizeTrades(trades),
    flow: dailyFlow(trades, 7, now),
    recent: events.slice(0, 25),
    recentWindowEvents: events.length,
    allTimeEvents: activity?.allTimeCount ?? null,
    /** "partial": the 7-day walk hit the page limit; "failed": Grail's activity endpoint didn't answer. */
    activityStatus: !activity ? "failed" : activity.complete ? "ok" : "partial",
    holders: holderRows,
    holderCount: holders?.count ?? null,
    /** Concentration among collectors; Grail's own inventory wallet is reported separately as `grailShare`. */
    concentration: holderConcentration(collectorRows),
    grailShare,
    perItem,
    itemValue: itemValue(token.market_price, perItem),
    vaulted: vaultedItems(token),
    population: pop,
    vault,
    backing: supplyBacking(token),
    redeemable: redeemCandidates(holderRows, perItem, 1).filter((c) => !isGrailWallet(c.name)),
    grailRedeemable: redeemCandidates(holderRows, perItem, 1).filter((c) => isGrailWallet(c.name)).reduce((s, c) => s + c.items, 0),
    nearRedeem: redeemCandidates(holderRows, perItem, 0.5).filter((c) => c.items === 0 && !isGrailWallet(c.name)),
    quote,
  };
});

export type TokenView = NonNullable<Awaited<ReturnType<typeof loadToken>>>;

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

const TOKEN_OPTS = { timeframe: "1h", windowDays: 7 } as const;

/** One cached token request; the layout uses it to 404 before streaming and the page reuses the same fetch. */
export const findToken = cache(
  async (symbol: string) => (await getToken(symbol, TOKEN_OPTS)) ?? (await getToken(alternateSymbol(symbol), TOKEN_OPTS)),
);

export const loadToken = cache(async (symbol: string) => {
  const token = await findToken(symbol);
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
    /**
     * "failed": Grail's activity endpoint didn't answer at all; "interrupted": a later page failed, so only the
     * newest events were read; "partial": the 7-day walk hit the page limit.
     */
    activityStatus: !activity ? "failed" : activity.error ? "interrupted" : activity.complete ? "ok" : "partial",
    holders: holderRows,
    holderCount: holders?.count ?? null,
    /** Concentration among collectors; Grail's own inventory wallet is reported separately as `grailShare`. */
    collectors: collectorRows,
    /** Shares of the collector float (supply outside Grail's inventory), not of total supply. */
    concentration: holderConcentration(collectorRows, 1 - grailShare),
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

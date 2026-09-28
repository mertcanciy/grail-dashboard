import { cache } from "react";
import { clipToWindow, getActivityWindow, getHolders, getToken, getTokenVault } from "./grail/api";
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

export const loadToken = cache(async (symbol: string) => {
  const token = await getToken(symbol, { timeframe: "1h", windowDays: 7 });
  if (!token) return null;
  const [activity, holders, vault, quote] = await Promise.all([
    getActivityWindow(token.symbol, 7).catch(() => ({ events: [], allTimeCount: 0 })),
    getHolders(token.symbol, 50).catch(() => null),
    getTokenVault(token),
    getItemQuote(token.symbol).catch(() => null),
  ]);
  const now = Date.now();
  const trades = activity.events.filter(isTrade);
  const perItem = tokensPerItem(token);
  const pop = token.reserves.reduce((s, r) => s + (r.psa_pop || 0), 0);
  const holderRows = holders?.results ?? [];

  return {
    now,
    token,
    candles7d: clipToWindow(token.ohlcv_list ?? [], 7),
    summary: summarizeTrades(trades),
    flow: dailyFlow(trades, 7, now),
    recent: activity.events.slice(0, 25),
    allTimeEvents: activity.allTimeCount,
    holders: holderRows,
    holderCount: holders?.count ?? null,
    concentration: holderConcentration(holderRows),
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

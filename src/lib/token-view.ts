import { cache } from "react";
import { clipToWindow, getActivityWindow, getHolders, getToken } from "./grail/api";
import { tokensPerItem, vaultedItems } from "./grail/meta";
import { dailyFlow, holderConcentration, isTrade, itemValue, summarizeTrades } from "./metrics";

export const loadToken = cache(async (symbol: string) => {
  const token = await getToken(symbol, { timeframe: "1h", windowDays: 7 });
  if (!token) return null;
  const [activity, holders] = await Promise.all([
    getActivityWindow(token.symbol, 7).catch(() => ({ events: [], allTimeCount: 0 })),
    getHolders(token.symbol, 50).catch(() => null),
  ]);
  const now = Date.now();
  const trades = activity.events.filter(isTrade);
  const perItem = tokensPerItem(token);
  const pop = token.reserves.reduce((s, r) => s + (r.psa_pop || 0), 0);

  return {
    now,
    token,
    candles7d: clipToWindow(token.ohlcv_list ?? [], 7),
    summary: summarizeTrades(trades),
    flow: dailyFlow(trades, 7, now),
    recent: activity.events.slice(0, 25),
    allTimeEvents: activity.allTimeCount,
    holders: holders?.results ?? [],
    holderCount: holders?.count ?? null,
    concentration: holderConcentration(holders?.results ?? []),
    perItem,
    itemValue: itemValue(token.market_price, perItem),
    vaulted: vaultedItems(token),
    population: pop,
  };
});

export type TokenView = NonNullable<Awaited<ReturnType<typeof loadToken>>>;

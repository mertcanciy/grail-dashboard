import type {
  Activity,
  Candle,
  GrailToken,
  Holder,
  Leaderboard,
  LeaderboardMetric,
  LeaderboardPeriod,
  MarketStatistics,
  Pack,
  Paginated,
  ProfileActivity,
  ProfileHoldings,
  ProfileOverview,
  Reserve,
  TokenActivity,
  VaultItem,
} from "./types";
import { saneUsdValue } from "../metrics";

const BASE_URL = "https://grail.xyz/api";
const USER_AGENT = "grail-dashboard/0.1 (+https://github.com/mertcanciy/grail-dashboard)";
const DAY_MS = 86_400_000;
/** Largest page Grail's activity endpoints serve. */
const PAGE_SIZE = 200;

export const REVALIDATE = {
  market: 120,
  activity: 300,
  slow: 900,
} as const;

type Params = Record<string, string | number | boolean | undefined | null>;

export class GrailApiError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
  ) {
    super(`Grail API ${status} for ${path}`);
  }
}

const ATTEMPTS = 3;
const TIMEOUT_MS = 12_000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One slow or dropped response from Grail used to fail a whole build or page render. Time out each attempt and
 * retry network errors and 5xx/429 responses with a short backoff; 4xx answers are returned immediately.
 */
async function grail<T>(path: string, params: Params = {}, revalidate: number = REVALIDATE.market): Promise<T> {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": USER_AGENT },
        next: { revalidate, tags: ["grail"] },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (res.ok) return (await res.json()) as T;
      const error = new GrailApiError(`${path}${url.search}`, res.status);
      if ((res.status < 500 && res.status !== 429) || attempt >= ATTEMPTS) throw error;
    } catch (e) {
      if (e instanceof GrailApiError && ((e.status < 500 && e.status !== 429) || attempt >= ATTEMPTS)) throw e;
      if (!(e instanceof GrailApiError) && attempt >= ATTEMPTS) throw e;
    }
    await sleep(400 * 2 ** (attempt - 1));
  }
}

export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

export type OhlcvTimeframe = "15m" | "1h" | "4h" | "1d";

export const OHLCV_RANGES = {
  "1d": { timeframe: "15m", windowDays: 1 },
  "7d": { timeframe: "1h", windowDays: 7 },
  "30d": { timeframe: "4h", windowDays: 30 },
} as const satisfies Record<string, { timeframe: OhlcvTimeframe; windowDays: number }>;

export type OhlcvRange = keyof typeof OHLCV_RANGES;

export async function getTokens(opts: { timeframe?: OhlcvTimeframe; windowDays?: number } = {}) {
  const tokens: GrailToken[] = [];
  let page = 1;
  let totalMarketCap = 0;
  for (;;) {
    const data = await grail<Paginated<GrailToken> & { total_market_cap: string }>("tokens", {
      limit: 100,
      page,
      ohlcv_timeframe: opts.timeframe ?? "1h",
      ohlcv_window_days: opts.windowDays ?? 7,
      sort_by: "market_cap",
      sort_order: "desc",
    });
    tokens.push(...data.results);
    totalMarketCap = Number(data.total_market_cap);
    if (!data.next || data.results.length === 0 || page >= 5) break;
    page++;
  }
  return { tokens: tokens.filter((t) => t.deployment_status === "DEPLOYED"), totalMarketCap };
}

export async function getToken(symbol: string, opts: { timeframe?: OhlcvTimeframe; windowDays?: number } = {}) {
  try {
    return await grail<GrailToken>(`tokens/${encodeURIComponent(symbol)}`, {
      ohlcv_timeframe: opts.timeframe ?? "1h",
      ohlcv_window_days: opts.windowDays ?? 7,
    });
  } catch (e) {
    if (e instanceof GrailApiError && e.status === 404) return null;
    throw e;
  }
}

export function getActivityPage(symbol: string, page = 1, limit = PAGE_SIZE) {
  return grail<Paginated<Activity>>(
    `tokens/${encodeURIComponent(symbol)}/activity`,
    { page, limit, include_packs: true, include_lp: true },
    REVALIDATE.activity,
  );
}

/** Pages fetched at once while walking activity; Grail takes ~2.5 s per 200-event page. */
const PAGE_BATCH = 4;
/** 60 pages × 200 events covers a week of the busiest token so far (VLAD: ~9,500 events in its first day). */
export const MAX_ACTIVITY_PAGES = 60;

export interface ActivityWalk<T> {
  events: T[];
  allTimeCount: number;
  /** False when the page limit was reached before the window's start, so older events in the window are missing. */
  complete: boolean;
}

/**
 * Walks newest-first activity pages until events are older than `since`, fetching `PAGE_BATCH` pages at a time
 * after the first.
 * Pages are offset-based, so events can shift between pages while we read; dedupe by tx+log.
 */
export async function walkActivity<T extends Pick<Activity, "tx_hash" | "log_index" | "type" | "block_timestamp">>(
  fetchPage: (page: number) => Promise<Paginated<T>>,
  since: number,
  maxPages = MAX_ACTIVITY_PAGES,
): Promise<ActivityWalk<T>> {
  const seen = new Set<string>();
  const events: T[] = [];
  let total = 0;
  let lastPage = maxPages;
  // Page 1 alone first: it tells us how many pages exist, and most tokens fit on it.
  for (let first = 1; first <= lastPage; first += first === 1 ? 1 : PAGE_BATCH) {
    const pages = first === 1 ? [1] : Array.from({ length: Math.min(PAGE_BATCH, lastPage - first + 1) }, (_, i) => first + i);
    const batch = await Promise.all(pages.map(fetchPage));
    for (const data of batch) {
      total = data.count;
      lastPage = Math.min(maxPages, Math.max(1, Math.ceil(data.count / PAGE_SIZE)));
      let reachedEnd = false;
      for (const a of data.results) {
        if (Date.parse(a.block_timestamp) < since) {
          reachedEnd = true;
          break;
        }
        const key = `${a.tx_hash}:${a.log_index}:${a.type}`;
        if (seen.has(key)) continue;
        seen.add(key);
        events.push(a);
      }
      if (reachedEnd || !data.next || data.results.length === 0) return { events, allTimeCount: total, complete: true };
    }
  }
  return { events, allTimeCount: total, complete: Math.ceil(total / PAGE_SIZE) <= maxPages };
}

export async function getActivityWindow(
  symbol: string,
  days: number,
  maxPages = MAX_ACTIVITY_PAGES,
  token?: GrailToken,
): Promise<ActivityWalk<TokenActivity>> {
  const walk = await walkActivity((page) => getActivityPage(symbol, page), Date.now() - days * DAY_MS, maxPages);
  return {
    ...walk,
    events: walk.events.map((a) => (token ? { ...a, symbol, usd_value: String(saneUsdValue(a, token)) } : { ...a, symbol })),
  };
}

export async function getMarketActivity(tokens: GrailToken[], days = 7) {
  const results = await mapLimit(tokens, 4, async (t) => {
    try {
      return { symbol: t.symbol, ok: true, ...(await getActivityWindow(t.symbol, days, MAX_ACTIVITY_PAGES, t)) };
    } catch {
      return { symbol: t.symbol, ok: false, events: [] as TokenActivity[], allTimeCount: 0, complete: false };
    }
  });
  const events = results.flatMap((r) => r.events);
  events.sort((a, b) => Date.parse(b.block_timestamp) - Date.parse(a.block_timestamp));
  const allTimeCounts = Object.fromEntries(results.map((r) => [r.symbol, r.allTimeCount]));
  return {
    events,
    allTimeCounts,
    /** Tokens whose activity couldn't be loaded, or was cut off by the page limit; their stats are undercounted. */
    coverage: {
      failed: results.filter((r) => !r.ok).map((r) => r.symbol),
      truncated: results.filter((r) => r.ok && !r.complete).map((r) => r.symbol),
    },
  };
}

/** Live Robinhood quote for the equity an equity-paired pool trades against. Null when unavailable. */
export async function getEquityQuote(tickerSymbol: string) {
  try {
    const q = await grail<{ mid: string; generated_at: string; is_trading_halt: boolean }>(
      `robinhood/tickers/${encodeURIComponent(tickerSymbol.toUpperCase())}/latest`,
      {},
      60,
    );
    const mid = Number(q.mid);
    return Number.isFinite(mid) && mid > 0 ? { mid, at: q.generated_at, halted: q.is_trading_halt } : null;
  } catch {
    return null;
  }
}

export function getHolders(symbol: string, limit = 50) {
  return grail<Paginated<Holder>>(
    `tokens/${encodeURIComponent(symbol)}/holders`,
    { limit, page: 1, include_packs: false },
    REVALIDATE.slow,
  );
}

export async function getHolderCounts(tokens: GrailToken[]) {
  const counts = await mapLimit(tokens, 6, async (t) => {
    try {
      return [t.symbol, (await getHolders(t.symbol, 1)).count] as const;
    } catch {
      return [t.symbol, null] as const;
    }
  });
  return Object.fromEntries(counts) as Record<string, number | null>;
}

export function getLeaderboard(period: LeaderboardPeriod, metric: LeaderboardMetric, limit = 50) {
  return grail<Leaderboard>("pnl/leaderboard", { period, metric, direction: "desc", limit }, REVALIDATE.activity);
}

export async function getPacks() {
  const data = await grail<{ packs: Pack[] }>("packs", {}, REVALIDATE.slow);
  return data.packs.filter((p) => p.pack_id !== "TEST");
}

/** Every registered slab behind one reserve, with its grading certificate number and registration tx. */
export async function getReserveItems(reserveSymbol: string) {
  try {
    const data = await grail<Paginated<VaultItem>>(
      `reserves/${encodeURIComponent(reserveSymbol)}/nfts/`,
      { limit: 100, page: 1 },
      REVALIDATE.slow,
    );
    return data.results;
  } catch {
    return [];
  }
}

export async function getOffchainItems(collectibleId: number) {
  try {
    return (await grail<Paginated<VaultItem>>(`offchain-collectibles/${collectibleId}/items`, {}, REVALIDATE.slow)).results;
  } catch {
    return [];
  }
}

/** Slabs for every reserve and off-chain collectible of a token, keyed by reserve symbol / collectible id. */
export async function getTokenVault(token: Pick<GrailToken, "reserves" | "offchain_collectibles">) {
  const [reserves, offchain] = await Promise.all([
    Promise.all(token.reserves.map(async (r: Reserve) => [r.symbol, await getReserveItems(r.symbol)] as const)),
    Promise.all(token.offchain_collectibles.map(async (c) => [c.collectible_id, await getOffchainItems(c.collectible_id)] as const)),
  ]);
  return {
    reserves: Object.fromEntries(reserves) as Record<string, VaultItem[]>,
    offchain: Object.fromEntries(offchain) as Record<number, VaultItem[]>,
  };
}

export async function getStatistics() {
  try {
    return await grail<MarketStatistics>("tokens/statistics", {}, REVALIDATE.market);
  } catch {
    return null;
  }
}

/** Grail profile endpoints work for any wallet that has a Grail account; others return 404 (null here). */
async function profile<T>(address: string, path: string, params: Params = {}) {
  try {
    return await grail<T>(`profile/${encodeURIComponent(address)}/${path}`, params, REVALIDATE.market);
  } catch (e) {
    if (e instanceof GrailApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

export const getProfileOverview = (address: string) => profile<ProfileOverview>(address, "overview");
export const getProfileHoldings = (address: string) => profile<ProfileHoldings>(address, "holdings");
export const getProfileActivity = (address: string, limit = 50) =>
  profile<{ items: ProfileActivity[]; next_cursor: string | null }>(address, "activity", { limit });

/**
 * Grail only returns buckets that saw trades, so quiet tokens get sparse history reaching far back.
 * Clip to the requested window and carry the last earlier close in as the starting point.
 */
export function clipToWindow(candles: Candle[], windowDays: number) {
  const start = Math.floor(Date.now() / 1000) - windowDays * 86_400;
  const inside = candles.filter((c) => c[0] >= start);
  const before = candles.filter((c) => c[0] < start).at(-1);
  if (!before) return inside;
  const close = before[4];
  return [[start, close, close, close, close, 0] as Candle, ...inside];
}

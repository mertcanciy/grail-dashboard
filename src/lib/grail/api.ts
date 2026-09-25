import type {
  Activity,
  Candle,
  GrailToken,
  Holder,
  Leaderboard,
  LeaderboardMetric,
  LeaderboardPeriod,
  Pack,
  Paginated,
  TokenActivity,
} from "./types";

const BASE_URL = "https://grail.xyz/api";
const USER_AGENT = "grail-dashboard/0.1 (+https://github.com/mertcanciy/grail-dashboard)";
const DAY_MS = 86_400_000;

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

async function grail<T>(path: string, params: Params = {}, revalidate: number = REVALIDATE.market): Promise<T> {
  const url = new URL(`${BASE_URL}/${path}`);
  for (const [k, v] of Object.entries(params)) if (v != null) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    next: { revalidate, tags: ["grail"] },
  });
  if (!res.ok) throw new GrailApiError(`${path}${url.search}`, res.status);
  return res.json() as Promise<T>;
}

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
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

export function getActivityPage(symbol: string, page = 1, limit = 200) {
  return grail<Paginated<Activity>>(
    `tokens/${encodeURIComponent(symbol)}/activity`,
    { page, limit, include_packs: true, include_lp: true },
    REVALIDATE.activity,
  );
}

/**
 * Walks activity pages (newest first) until events are older than `days`.
 * Pages are offset-based, so events can shift between pages while we read; dedupe by tx+log.
 */
export async function getActivityWindow(symbol: string, days: number, maxPages = 25) {
  const since = Date.now() - days * DAY_MS;
  const seen = new Set<string>();
  const events: TokenActivity[] = [];
  let total = 0;
  for (let page = 1; page <= maxPages; page++) {
    const data = await getActivityPage(symbol, page);
    total = data.count;
    let reachedEnd = false;
    for (const a of data.results) {
      if (Date.parse(a.block_timestamp) < since) {
        reachedEnd = true;
        break;
      }
      const key = `${a.tx_hash}:${a.log_index}:${a.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      events.push({ ...a, symbol });
    }
    if (reachedEnd || !data.next) break;
  }
  return { events, allTimeCount: total };
}

export async function getMarketActivity(tokens: GrailToken[], days = 7) {
  const results = await mapLimit(tokens, 6, async (t) => {
    try {
      return { symbol: t.symbol, ...(await getActivityWindow(t.symbol, days)) };
    } catch {
      return { symbol: t.symbol, events: [] as TokenActivity[], allTimeCount: 0 };
    }
  });
  const events = results.flatMap((r) => r.events);
  events.sort((a, b) => Date.parse(b.block_timestamp) - Date.parse(a.block_timestamp));
  const allTimeCounts = Object.fromEntries(results.map((r) => [r.symbol, r.allTimeCount]));
  return { events, allTimeCounts };
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

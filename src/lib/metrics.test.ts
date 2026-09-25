import { describe, expect, it } from "vitest";
import type { GrailToken, TokenActivity } from "./grail/types";
import {
  activityHeatmap,
  breakdown,
  buySizeHistogram,
  dailyFlow,
  holderConcentration,
  marketLenses,
  median,
  since,
  summarizeTrades,
} from "./metrics";
import { categoryOf, quoteAssetOf, ticker, tokensPerItem } from "./grail/meta";
import { formatPercent, formatPrice, formatUsd } from "./format";

const NOW = Date.parse("2026-09-25T12:00:00Z");
let log = 0;

function ev(partial: Partial<TokenActivity> & Pick<TokenActivity, "type">): TokenActivity {
  log++;
  return {
    address: "0xaaa",
    block_number: 1,
    block_timestamp: "2026-09-25T10:00:00Z",
    display_name: "0xaaa",
    log_index: log,
    token_amount: "1",
    tx_hash: `0x${log}`,
    usd_value: "0",
    symbol: "gYAMAL",
    ...partial,
  };
}

function token(partial: Partial<GrailToken> & Pick<GrailToken, "symbol">): GrailToken {
  return {
    chain_id: 8453,
    token_id: 1,
    token_address: "0x1",
    pool_address: "0x2",
    name: partial.symbol.replace(/^g/, ""),
    decimals: 18,
    image_url: "",
    tags: ["Football"],
    market_price: 1,
    market_cap: "0",
    volume_24h: "0",
    price_change_1h_percent: "0",
    price_change_24h_percent: "0",
    price_change_7d_percent: "0",
    volume_change_24h_percent: "0",
    deployment_status: "DEPLOYED",
    block_number: 1,
    tx_hash: "0x",
    created_at: "",
    updated_at: "",
    total_supply: 10000,
    circulating_supply: 10000,
    ohlcv_list: [],
    reserves: [],
    offchain_collectibles: [],
    player_market_cap: 0,
    player_fdv: 0,
    unpriced: false,
    ...partial,
  };
}

describe("summarizeTrades", () => {
  it("computes buy/sell volumes, averages and unique traders", () => {
    const s = summarizeTrades([
      ev({ type: "BUY", usd_value: "10", address: "0xA" }),
      ev({ type: "BUY", usd_value: "30", address: "0xa" }),
      ev({ type: "BUY", usd_value: "50", address: "0xb" }),
      ev({ type: "SELL", usd_value: "20", address: "0xc" }),
      ev({ type: "PACK_CLAIM", usd_value: "999" }),
    ]);
    expect(s.buys).toBe(3);
    expect(s.sells).toBe(1);
    expect(s.buyVolume).toBe(90);
    expect(s.sellVolume).toBe(20);
    expect(s.avgBuy).toBe(30);
    expect(s.medianBuy).toBe(30);
    expect(s.netFlow).toBe(70);
    expect(s.uniqueTraders).toBe(3);
    expect(s.uniqueBuyers).toBe(2);
    expect(s.largestBuy?.usd_value).toBe("50");
  });

  it("handles empty input", () => {
    const s = summarizeTrades([]);
    expect(s.avgBuy).toBe(0);
    expect(s.largestBuy).toBeNull();
    expect(s.buyShare).toBe(0);
  });
});

describe("median", () => {
  it("handles even and odd lengths", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe("since", () => {
  it("filters by window relative to now", () => {
    const events = [
      ev({ type: "BUY", block_timestamp: "2026-09-25T11:30:00Z" }),
      ev({ type: "BUY", block_timestamp: "2026-09-24T11:00:00Z" }),
    ];
    expect(since(events, 86_400_000, NOW)).toHaveLength(1);
  });
});

describe("buySizeHistogram", () => {
  it("buckets buys only, by USD size", () => {
    const h = buySizeHistogram([
      ev({ type: "BUY", usd_value: "5" }),
      ev({ type: "BUY", usd_value: "10" }),
      ev({ type: "BUY", usd_value: "9000" }),
      ev({ type: "SELL", usd_value: "5" }),
    ]);
    expect(h.map((b) => b.count)).toEqual([1, 1, 0, 0, 0, 1]);
    expect(h[0].share).toBeCloseTo(1 / 3);
  });
});

describe("breakdown", () => {
  it("groups, sorts by volume and computes shares", () => {
    const rows = breakdown(
      [ev({ type: "BUY", usd_value: "10", symbol: "a" }), ev({ type: "BUY", usd_value: "30", symbol: "b" }), ev({ type: "SELL", usd_value: "10", symbol: "b" })],
      (e) => e.symbol,
    );
    expect(rows.map((r) => r.key)).toEqual(["b", "a"]);
    expect(rows[0].volumeShare).toBeCloseTo(0.8);
    expect(rows[0].countShare).toBeCloseTo(2 / 3);
    expect(rows[0].avg).toBe(20);
  });
});

describe("marketLenses", () => {
  const tokens = [
    token({ symbol: "gYAMAL", tags: ["Football"] }),
    token({ symbol: "gELON", tags: ["Founder", "WTM"], peg_ticker: "SPCX" }),
    token({ symbol: "JENSEN", name: "gJENSEN", chain_id: 4663, tags: ["WTM", "Founder"], peg_ticker: "NVDA" }),
  ];
  const events = [
    ev({ type: "BUY", usd_value: "100", symbol: "gYAMAL", address: "0x1", username: "ozzy" }),
    ev({ type: "SELL", usd_value: "50", symbol: "gELON", address: "0x2" }),
    ev({ type: "BUY", usd_value: "300", symbol: "JENSEN", address: "0x1" }),
    ev({ type: "LP_ADD", usd_value: "40", symbol: "gELON" }),
    ev({ type: "PACK_CLAIM", usd_value: "10", symbol: "gYAMAL" }),
  ];
  const lenses = marketLenses(events, tokens);

  it("ranks tokens by trade volume and uses display tickers", () => {
    expect(lenses.token.map((r) => r.label)).toEqual(["gJENSEN", "gYAMAL", "gELON"]);
  });

  it("groups categories while ignoring the WTM tag", () => {
    expect(lenses.category.map((r) => r.key)).toEqual(["Founder", "Football"]);
  });

  it("splits venues by chain and quote asset", () => {
    expect(lenses.venue.map((r) => r.label)).toEqual([
      "Robinhood Chain, NVDA pools",
      "Base, USDC pools",
      "Base, SPCX pools",
    ]);
  });

  it("includes liquidity and pack events in the action lens", () => {
    expect(lenses.action.map((r) => r.key).sort()).toEqual(["buy", "lp", "pack-claim", "sell"]);
  });

  it("aggregates wallets case-insensitively and prefers usernames", () => {
    expect(lenses.wallet[0]).toMatchObject({ key: "0x1", label: "ozzy", volume: 400, count: 2 });
  });
});

describe("activityHeatmap", () => {
  it("places trades by UTC weekday (Mon=0) and hour", () => {
    const { grid, max } = activityHeatmap([ev({ type: "BUY", block_timestamp: "2026-09-21T03:15:00Z" })]);
    expect(grid[0][3].count).toBe(1);
    expect(max).toBe(1);
  });
});

describe("dailyFlow", () => {
  it("buckets buy and sell volume into days ending today", () => {
    const rows = dailyFlow(
      [ev({ type: "BUY", usd_value: "5", block_timestamp: "2026-09-25T01:00:00Z" }), ev({ type: "SELL", usd_value: "7", block_timestamp: "2026-09-24T23:00:00Z" })],
      2,
      NOW,
    );
    expect(rows).toHaveLength(2);
    expect(rows[0].sell).toBe(7);
    expect(rows[1].buy).toBe(5);
  });
});

describe("holderConcentration", () => {
  it("sums the top holders' share", () => {
    const c = holderConcentration([{ percentage: "10" }, { percentage: "5" }, { percentage: "1" }]);
    expect(c.top1).toBeCloseTo(0.1);
    expect(c.top10).toBeCloseTo(0.16);
  });
});

describe("meta helpers", () => {
  it("normalises tickers across Grail's naming quirks", () => {
    expect(ticker({ symbol: "gYAMAL", name: "YAMAL" })).toBe("gYAMAL");
    expect(ticker({ symbol: "JENSEN", name: "gJENSEN" })).toBe("gJENSEN");
    expect(ticker({ symbol: "FOO", name: "FOO" })).toBe("gFOO");
  });

  it("derives category, quote asset and redemption size", () => {
    expect(categoryOf({ tags: ["WTM", "Founder"] })).toBe("Founder");
    expect(quoteAssetOf({ peg_ticker: null })).toBe("USDC");
    expect(quoteAssetOf({ peg_ticker: "nvda" })).toBe("NVDA");
    expect(tokensPerItem({ reserves: [{ multiplier: 50000 }, { multiplier: 10000 }] as GrailToken["reserves"] })).toBe(10000);
  });
});

describe("format", () => {
  it("formats prices across magnitudes", () => {
    expect(formatPrice(0.0015121)).toBe("$0.001512");
    expect(formatPrice(0.16222429)).toBe("$0.1622");
    expect(formatPrice(42.905)).toBe("$42.91");
  });

  it("formats usd and signed percents", () => {
    expect(formatUsd(3_420_337, { compact: true })).toBe("$3.4M");
    expect(formatUsd(45.67)).toBe("$45.67");
    expect(formatPercent("-17.69", { sign: true })).toBe("−17.7%");
    expect(formatPercent(59.6, { sign: true })).toBe("+59.6%");
  });
});

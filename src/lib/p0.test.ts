import { describe, expect, it } from "vitest";
import { walkActivity } from "./grail/api";
import { primaryReserve, profileActivityLabel, profileActivitySubject, tokensPerItem } from "./grail/meta";
import type { Activity, Paginated } from "./grail/types";

const HOUR = 3_600_000;
const NOW = Date.parse("2026-09-28T12:00:00Z");

/** A newest-first feed of `n` events spaced `gapMs` apart, served in 200-event pages. */
function feed(n: number, gapMs: number) {
  const all = Array.from({ length: n }, (_, i) => ({
    tx_hash: `0x${i}`,
    log_index: 0,
    type: "BUY",
    block_timestamp: new Date(NOW - i * gapMs).toISOString(),
  })) as Activity[];
  const calls: number[] = [];
  const fetchPage = async (page: number): Promise<Paginated<Activity>> => {
    calls.push(page);
    const results = all.slice((page - 1) * 200, page * 200);
    return { count: n, next: page * 200 < n ? `?page=${page + 1}` : null, previous: null, results };
  };
  return { fetchPage, calls };
}

describe("walkActivity", () => {
  it("stops at the start of the window and reports a complete walk", async () => {
    const { fetchPage, calls } = feed(5_000, HOUR / 10);
    const w = await walkActivity(fetchPage, NOW - 24 * HOUR, 60);
    expect(w.complete).toBe(true);
    expect(w.events).toHaveLength(241);
    expect(w.allTimeCount).toBe(5_000);
    expect(Math.max(...calls)).toBeLessThanOrEqual(5);
  });

  it("flags a walk that hits the page limit inside the window", async () => {
    const { fetchPage } = feed(9_500, 1_000);
    const w = await walkActivity(fetchPage, NOW - 7 * 24 * HOUR, 25);
    expect(w.complete).toBe(false);
    expect(w.events).toHaveLength(5_000);
  });

  it("reads a busy first day past the old 25-page cap", async () => {
    const { fetchPage } = feed(9_500, 1_000);
    const w = await walkActivity(fetchPage, NOW - 7 * 24 * HOUR, 60);
    expect(w.complete).toBe(true);
    expect(w.events).toHaveLength(9_500);
  });

  it("never requests pages past the end of the feed", async () => {
    const { fetchPage, calls } = feed(450, 1_000);
    const w = await walkActivity(fetchPage, 0, 60);
    expect(w.events).toHaveLength(450);
    expect(Math.max(...calls)).toBe(3);
  });

  it("dedupes events that shift across pages while walking", async () => {
    const dup = { tx_hash: "0xa", log_index: 1, type: "BUY", block_timestamp: new Date(NOW).toISOString() } as Activity;
    const w = await walkActivity(
      async (page) => ({ count: 2, next: page === 1 ? "?page=2" : null, previous: null, results: [dup] }),
      0,
      60,
    );
    expect(w.events).toHaveLength(1);
  });
});

describe("primaryReserve", () => {
  it("picks the cheapest item to redeem on multi-reserve tokens", () => {
    const token = {
      reserves: [
        { name: "Kirk hat", multiplier: 50_000 },
        { name: "Kirk card", multiplier: 10_000 },
      ],
    };
    expect(primaryReserve(token)?.name).toBe("Kirk card");
    expect(tokensPerItem(token as never)).toBe(10_000);
  });

  it("falls back to the first reserve when multipliers are missing", () => {
    expect(primaryReserve({ reserves: [{ name: "a", multiplier: 0 }] })?.name).toBe("a");
    expect(primaryReserve({ reserves: [] })).toBeUndefined();
  });
});

describe("wallet activity labels", () => {
  it("names achievements and opened packs", () => {
    expect(profileActivityLabel("achievement")).toBe("Achievement");
    expect(profileActivityLabel("PACK_OPEN")).toBe("Opened pack");
    expect(profileActivityLabel("some_new_kind")).toBe("Some new kind");
    expect(
      profileActivitySubject({ kind: "achievement", detail: "Six Figures", token_name: null, token_symbol: null }),
    ).toBe("Six Figures");
    expect(
      profileActivitySubject({ kind: "pack_open", detail: "FOUNDERPACKSVERIFIEDLEGEND", token_name: null, token_symbol: null }),
    ).toBe("Founder Packs Verified Legend");
    expect(profileActivitySubject({ kind: "buy", token_name: "gKIRK", token_symbol: "gKIRK" })).toBe("gKIRK");
  });
});

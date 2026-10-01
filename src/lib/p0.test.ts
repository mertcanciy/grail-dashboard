import { describe, expect, it } from "vitest";
import { walkActivity } from "./grail/api";
import {
  packDisplayNames,
  primaryReserve,
  profileActivityLabel,
  profileActivitySubject,
  tokensPerItem,
  walletActivityFromFeed,
} from "./grail/meta";
import { holderConcentration } from "./metrics";
import { feedStatus, toActivityRows } from "./activity-rows";
import type { Activity, GrailToken, Paginated, ProfileActivity, TokenActivity } from "./grail/types";

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

describe("walkActivity page failures", () => {
  it("keeps the events read before a failed page and reports the error", async () => {
    const { fetchPage } = feed(5_000, 1_000);
    const failing = (page: number) => (page === 3 ? Promise.reject(new Error("502")) : fetchPage(page));
    const w = await walkActivity(failing, NOW - 7 * 24 * HOUR, 60);
    expect(w.complete).toBe(false);
    expect(w.error).toBeInstanceOf(Error);
    expect(w.events).toHaveLength(400);
    expect(w.allTimeCount).toBe(5_000);
  });

  it("throws when the first page fails, since nothing was read", async () => {
    await expect(walkActivity(() => Promise.reject(new Error("down")), NOW - HOUR, 60)).rejects.toThrow("down");
  });
});

describe("pack names", () => {
  // A slice of https://grail.xyz/api/packs as of 2026-09-29.
  const catalog = [
    { pack_id: "GRAILGENESISPACKS6", display_name: "2026 Young Kings Series #6" },
    { pack_id: "POKEMONGENESISPACKS2", display_name: "2026 POKEMANIA Series #1" },
    { pack_id: "FOUNDERSPACKSOG", display_name: "Founder Series #1" },
    { pack_id: "FOUNDERPACKSLEGEND", display_name: "Founder Series #1" },
    { pack_id: "FOUNDERPACKSVERIFIEDLEGEND", display_name: "Founder Series #1" },
    { pack_id: "FOUNDERPACKSGOAT", display_name: "Founder Series #1" },
    { pack_id: "KIRKLAUNCHPACKS1", display_name: "KIRK LAUNCH Series #1" },
    { pack_id: "KIRKLAUNCHPACK", display_name: "KIRK LAUNCH Series #1" },
  ];
  const names = packDisplayNames(catalog);
  const open = (detail: string) => profileActivitySubject({ kind: "pack_open", detail, token_name: null, token_symbol: null }, names);

  it("uses Grail's catalog name for a pack id", () => {
    expect(open("GRAILGENESISPACKS6")).toBe("2026 Young Kings Series #6");
    expect(open("POKEMONGENESISPACKS2")).toBe("2026 POKEMANIA Series #1");
  });

  it("tells apart ids that share one catalog name when the id splits cleanly", () => {
    expect(open("FOUNDERPACKSVERIFIEDLEGEND")).toBe("Founder Series #1 · Verified Legend");
    expect(open("FOUNDERPACKSLEGEND")).toBe("Founder Series #1 · Legend");
    expect(open("FOUNDERSPACKSOG")).toBe("Founder Series #1 · OG");
    expect(open("FOUNDERPACKSGOAT")).toBe("Founder Series #1 · GOAT");
    expect(open("KIRKLAUNCHPACKS1")).toBe("KIRK LAUNCH Series #1");
  });

  it("falls back to splitting the id when the catalog doesn't know it", () => {
    expect(open("FOUNDERPACKSVERIFIEDLEGEND2")).toBe("Founder Packs Verified Legend 2");
    expect(profileActivitySubject({ kind: "pack_open", detail: "GRAILGENESISPACKS6", token_name: null, token_symbol: null })).toBe(
      "Grailgenesispacks6",
    );
  });
});

describe("holderConcentration", () => {
  it("measures collectors against the float outside Grail's inventory", () => {
    const collectors = [{ percentage: "0.5" }, { percentage: "0.3" }, { percentage: "0.2" }];
    const c = holderConcentration(collectors, 0.1);
    expect(c.top1).toBeCloseTo(0.05);
    expect(c.top10).toBeCloseTo(0.1);
    expect(holderConcentration(collectors).top10).toBeCloseTo(0.01);
  });
});

describe("walletActivityFromFeed", () => {
  const tokens = [
    { symbol: "gCOOP", chain_id: 8453 },
    { symbol: "gKAI", chain_id: 4663 },
  ] as Pick<GrailToken, "symbol" | "chain_id">[];
  const ev = (symbol: string, address: string, type: TokenActivity["type"], at: string) =>
    ({ symbol, address, type, block_timestamp: at, tx_hash: `0x${at}`, log_index: 0, token_amount: "10", usd_value: "5.00", price: "0.5", display_name: "" }) as TokenActivity;

  it("keeps only the wallet's rows, newest first, in profile-activity shape", () => {
    const rows = walletActivityFromFeed(
      [
        ev("gCOOP", "0xAbC", "LP_ADD", "2026-09-20T00:00:00Z"),
        ev("gKAI", "0xabc", "BUY", "2026-09-25T00:00:00Z"),
        ev("gKAI", "0xdef", "SELL", "2026-09-26T00:00:00Z"),
        ev("gGONE", "0xabc", "BUY", "2026-09-27T00:00:00Z"),
      ],
      "0xABC",
      tokens,
    );
    expect(rows.map((r) => [r.token_symbol, r.kind, r.chain_id])).toEqual([
      ["gKAI", "buy", 4663],
      ["gCOOP", "lp_add", 8453],
    ]);
    expect(rows[0]).toMatchObject({ amount_usdc: "5.00", side: "buy", token_amount: 10, price: 0.5 });
  });

  it("labels token-feed kinds that profile activity doesn't use", () => {
    expect(profileActivityLabel("pack_nft_buy")).toBe("Pack NFT buy");
    expect(profileActivityLabel("lp_fee_collect")).toBe("Collect fees");
  });
});

describe("toActivityRows", () => {
  const tokens = [{ symbol: "JENSEN", name: "gJENSEN" }];
  const row = (p: Partial<ProfileActivity>) =>
    ({ chain_id: 4663, kind: "buy", timestamp: "2026-09-25T00:00:00Z", token_symbol: null, token_name: null, amount_usdc: null, side: null, price: null, token_amount: null, tx_hash: null, image_url: null, ...p }) as ProfileActivity;

  it("links known gTokens and names achievements and packs", () => {
    const rows = toActivityRows(
      [
        row({ token_symbol: "jensen", amount_usdc: "12.5", tx_hash: "0xabc" }),
        row({ kind: "achievement", detail: "Six Figures" }),
        row({ kind: "pack_open", detail: "GRAILGENESISPACKS6" }),
      ],
      tokens,
      new Map([["GRAILGENESISPACKS6", "2026 Young Kings Series #6"]]),
    );
    expect(rows[0]).toMatchObject({ label: "Buy", ticker: "gJENSEN", href: "/tokens/jensen", usd: 12.5 });
    expect(rows[0].txUrl).toBe("https://robinhoodchain.blockscout.com/tx/0xabc");
    expect(rows.slice(1).map((r) => [r.label, r.subject, r.href, r.usd, r.txUrl])).toEqual([
      ["Achievement", "Six Figures", null, null, null],
      ["Opened pack", "2026 Young Kings Series #6", null, null, null],
    ]);
  });

  it("caps the list", () => {
    expect(toActivityRows(Array.from({ length: 40 }, () => row({})), tokens)).toHaveLength(25);
  });
});

describe("feedStatus", () => {
  const none: string[] = [];
  it("separates a full outage from partial gaps", () => {
    expect(feedStatus({ failed: none, interrupted: none, truncated: none }, 3)).toBe("ok");
    expect(feedStatus({ failed: ["gMJ"], interrupted: none, truncated: none }, 3)).toBe("incomplete");
    expect(feedStatus({ failed: none, interrupted: none, truncated: ["VLAD"] }, 3)).toBe("incomplete");
    expect(feedStatus({ failed: ["a", "b", "c"], interrupted: none, truncated: none }, 3)).toBe("unavailable");
  });
});

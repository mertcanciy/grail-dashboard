import { describe, expect, it } from "vitest";
import type { PublicClient } from "viem";
import { isUsdQuote } from "./grail/meta";
import { erc20Meta, gTokenIs0, v3PoolSides } from "./onchain";

describe("isUsdQuote", () => {
  it("recognizes USD stablecoin symbols case-insensitively", () => {
    expect(isUsdQuote("USDC")).toBe(true);
    expect(isUsdQuote("usdt")).toBe(true);
    expect(isUsdQuote("USDbC")).toBe(true);
  });

  it("does not treat non-USD symbols as stablecoins", () => {
    expect(isUsdQuote("GOOGL")).toBe(false);
    expect(isUsdQuote("?")).toBe(false);
    expect(isUsdQuote("WETH")).toBe(false);
  });
});

describe("gTokenIs0", () => {
  it("matches addresses case-insensitively", () => {
    expect(gTokenIs0("0xAbC", "0xaBc")).toBe(true);
    expect(gTokenIs0("0xabc", "0xdef")).toBe(false);
  });
});

describe("v3PoolSides", () => {
  const token0 = "0x0000000000000000000000000000000000000001";
  const token1 = "0x0000000000000000000000000000000000000002";
  const pool = "0x0000000000000000000000000000000000000003";
  const client = {
    readContract: async ({ functionName }: { functionName: string }) => {
      if (functionName === "token0") return token0;
      if (functionName === "token1") return token1;
      return 3000;
    },
  } as unknown as PublicClient;

  it("returns token1 as the quote asset when the gToken is token0", async () => {
    await expect(v3PoolSides(client, { pool_address: pool, token_address: token0 })).resolves.toMatchObject({
      token0,
      token1,
      fee: 3000,
      gIs0: true,
      quoteToken: token1,
    });
  });

  it("returns token0 as the quote asset when the gToken is token1", async () => {
    await expect(v3PoolSides(client, { pool_address: pool, token_address: token1.toUpperCase() })).resolves.toMatchObject({
      token0,
      token1,
      fee: 3000,
      gIs0: false,
      quoteToken: token0,
    });
  });
});

describe("erc20Meta", () => {
  it("uses the fallback symbol when symbol() fails and converts decimals to a number", async () => {
    const client = {
      readContract: async ({ functionName }: { functionName: string }) => {
        if (functionName === "symbol") throw new Error("symbol unavailable");
        return 6n;
      },
    } as unknown as PublicClient;

    await expect(erc20Meta(client, "0x0000000000000000000000000000000000000001", "USDC")).resolves.toEqual({
      decimals: 6,
      symbol: "USDC",
    });
  });
});

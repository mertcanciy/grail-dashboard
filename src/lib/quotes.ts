import { unstable_cache } from "next/cache";
import { erc20Abi, parseAbi, parseUnits, type Abi, type Address } from "viem";
import { base, robinhood } from "viem/chains";
import { getEquityQuote, getToken } from "./grail/api";
import { quoteAssetOf, tokensPerItem } from "./grail/meta";
import type { GrailToken } from "./grail/types";
import { clientFor } from "./onchain";

/** Uniswap quoter deployments (from @uniswap/sdk-core address maps). */
const QUOTERS: Record<number, { v3?: Address; v4: Address }> = {
  [base.id]: { v3: "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a", v4: "0x0d5e0f971ed27fbff6c2837bf31316121532048d" },
  [robinhood.id]: { v3: "0x33e885ed0ec9bf04ecfb19341582aadcb4c8a9e7", v4: "0x8dc178efb8111bb0973dd9d722ebeff267c98f94" },
};

// Quoters simulate a swap and revert internally, so they are safe to call via eth_call. Declared `view` so they
// can be batched through Multicall3 with allowFailure.
const v3QuoterAbi = parseAbi([
  "function quoteExactOutputSingle((address tokenIn, address tokenOut, uint256 amount, uint24 fee, uint160 sqrtPriceLimitX96) params) view returns (uint256 amountIn, uint160, uint32, uint256)",
  "function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96) params) view returns (uint256 amountOut, uint160, uint32, uint256)",
]);
const v4QuoterAbi = parseAbi([
  "struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }",
  "struct QuoteExactSingleParams { PoolKey poolKey; bool zeroForOne; uint128 exactAmount; bytes hookData; }",
  "function quoteExactOutputSingle(QuoteExactSingleParams params) view returns (uint256 amountIn, uint256 gasEstimate)",
  "function quoteExactInputSingle(QuoteExactSingleParams params) view returns (uint256 amountOut, uint256 gasEstimate)",
]);
const v3PoolAbi = parseAbi([
  "function token0() view returns (address)",
  "function token1() view returns (address)",
  "function fee() view returns (uint24)",
]);

/** Fractions of one redeemable item to quote; the full item plus a depth curve below it. */
export const DEPTH_FRACTIONS = [0.01, 0.05, 0.1, 0.25, 0.5, 1] as const;

export interface DepthPoint {
  fraction: number;
  tokens: number;
  /** USD cost to buy / USD received to sell `tokens`, or null when the pool can't fill that size. */
  buyUsd: number | null;
  sellUsd: number | null;
}

export interface ItemQuote {
  symbol: string;
  tokensPerItem: number;
  quoteSymbol: string;
  spotUsd: number;
  depth: DepthPoint[];
  /** Most USD the pool can pay out on a sell, when a sell of one item would drain it. */
  sellCapUsd: number | null;
  /** Largest quoted fraction of an item the pool can deliver on a buy (0 if none). */
  maxBuyFraction: number;
  /** USD value of one unit of the pool's quote asset, and where it came from. */
  quoteUsd: number;
  quoteUsdSource: "stablecoin" | "robinhood" | "implied";
  quotedAt: number;
}

type Leg = { kind: "buy" | "sell"; fraction: number };
type QuoteCall = { address: Address; abi: Abi; functionName: string; args: readonly unknown[] };

export async function computeItemQuote(token: GrailToken): Promise<ItemQuote | null> {
  const price = token.market_price ?? 0;
  const q = QUOTERS[token.chain_id];
  if (!q || price <= 0) return null;
  const client = clientFor(token.chain_id);
  const perItem = tokensPerItem(token);
  const gToken = token.token_address as Address;

  let quoteToken: Address;
  let calls: { leg: Leg; call: QuoteCall }[];

  if (token.v4_pool) {
    const k = token.v4_pool.pool_key;
    const gIs0 = k.currency0.toLowerCase() === gToken.toLowerCase();
    quoteToken = (gIs0 ? k.currency1 : k.currency0) as Address;
    const poolKey = {
      currency0: k.currency0 as Address,
      currency1: k.currency1 as Address,
      fee: k.fee,
      tickSpacing: k.tick_spacing,
      hooks: k.hooks as Address,
    };
    calls = DEPTH_FRACTIONS.flatMap((fraction) => {
      const exactAmount = parseUnits(String(perItem * fraction), 18);
      return [
        {
          leg: { kind: "buy", fraction } as Leg,
          call: {
            address: q.v4,
            abi: v4QuoterAbi,
            functionName: "quoteExactOutputSingle",
            args: [{ poolKey, zeroForOne: !gIs0, exactAmount, hookData: "0x" }],
          },
        },
        {
          leg: { kind: "sell", fraction } as Leg,
          call: {
            address: q.v4,
            abi: v4QuoterAbi,
            functionName: "quoteExactInputSingle",
            args: [{ poolKey, zeroForOne: gIs0, exactAmount, hookData: "0x" }],
          },
        },
      ];
    });
  } else {
    if (!q.v3) return null;
    const pool = token.pool_address as Address;
    const [t0, t1, fee] = await Promise.all([
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: "token0" }),
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: "token1" }),
      client.readContract({ address: pool, abi: v3PoolAbi, functionName: "fee" }),
    ]);
    quoteToken = t0.toLowerCase() === gToken.toLowerCase() ? t1 : t0;
    calls = DEPTH_FRACTIONS.flatMap((fraction) => {
      const amount = parseUnits(String(perItem * fraction), 18);
      return [
        {
          leg: { kind: "buy", fraction } as Leg,
          call: {
            address: q.v3!,
            abi: v3QuoterAbi,
            functionName: "quoteExactOutputSingle",
            args: [{ tokenIn: quoteToken, tokenOut: gToken, amount, fee, sqrtPriceLimitX96: 0n }],
          },
        },
        {
          leg: { kind: "sell", fraction } as Leg,
          call: {
            address: q.v3!,
            abi: v3QuoterAbi,
            functionName: "quoteExactInputSingle",
            args: [{ tokenIn: gToken, tokenOut: quoteToken, amountIn: amount, fee, sqrtPriceLimitX96: 0n }],
          },
        },
      ];
    });
  }

  const [decimals, symbol, results] = await Promise.all([
    client.readContract({ address: quoteToken, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address: quoteToken, abi: erc20Abi, functionName: "symbol" }).catch(() => quoteAssetOf(token)),
    client.multicall({ contracts: calls.map((c) => c.call), allowFailure: true }),
  ]);

  const amounts = results.map((r) => (r.status === "success" ? Number((r.result as readonly bigint[])[0]) / 10 ** decimals : null));
  const isUsd = /USD/i.test(symbol);

  // Stock-paired pools quote in an equity token; convert with Robinhood's live quote for that equity. Without
  // one, fall back to the rate implied by Grail's USD price and the smallest sell quote, which hides any gap
  // between the pool and Grail's price.
  let usdPerQuote = 1;
  let quoteUsdSource: ItemQuote["quoteUsdSource"] = "stablecoin";
  if (!isUsd) {
    const live = await getEquityQuote(token.peg_ticker?.trim() || String(symbol));
    if (live) {
      usdPerQuote = live.mid;
      quoteUsdSource = "robinhood";
    } else {
      const smallest = calls.findIndex((c) => c.leg.kind === "sell" && c.leg.fraction === DEPTH_FRACTIONS[0]);
      const out = amounts[smallest];
      if (!out) return null;
      usdPerQuote = (price * perItem * DEPTH_FRACTIONS[0]) / out;
      quoteUsdSource = "implied";
    }
  }

  const depth: DepthPoint[] = DEPTH_FRACTIONS.map((fraction) => {
    const find = (kind: Leg["kind"]) => {
      const i = calls.findIndex((c) => c.leg.kind === kind && c.leg.fraction === fraction);
      const v = amounts[i];
      return v != null && v > 0 ? v * usdPerQuote : null;
    };
    return { fraction, tokens: perItem * fraction, buyUsd: find("buy"), sellUsd: find("sell") };
  });

  return {
    symbol: token.symbol,
    tokensPerItem: perItem,
    quoteSymbol: symbol,
    spotUsd: price * perItem,
    ...capDepth(depth),
    quoteUsd: usdPerQuote,
    quoteUsdSource,
    quotedAt: Date.now(),
  };
}

/**
 * Exact-input quotes on a v3 pool don't revert when liquidity runs out; they return what the pool can pay before
 * hitting the price limit, so larger sizes repeat the same output. Treat a non-increasing output as "pool drained".
 */
export function capDepth(depth: DepthPoint[]) {
  let sellCapUsd: number | null = null;
  const capped = depth.map((d, i) => {
    const prev = depth[i - 1]?.sellUsd;
    if (sellCapUsd != null || (d.sellUsd != null && prev != null && d.sellUsd <= prev * 1.001)) {
      sellCapUsd ??= prev ?? d.sellUsd;
      return { ...d, sellUsd: null };
    }
    return d;
  });
  const buyable = capped.filter((d) => d.buyUsd != null);
  return {
    depth: capped,
    sellCapUsd,
    maxBuyFraction: buyable.length ? buyable[buyable.length - 1].fraction : 0,
  };
}

/**
 * Real, executable price of one redeemable item through the token's Uniswap pool, including fees and price impact.
 * Cached for five minutes so page views don't each hit the RPC.
 */
export const getItemQuote = unstable_cache(
  async (symbol: string) => {
    const token = await getToken(symbol, { timeframe: "1d", windowDays: 1 });
    if (!token) return null;
    try {
      return await computeItemQuote(token);
    } catch {
      return null;
    }
  },
  ["item-quote-v2"],
  { revalidate: 300, tags: ["grail", "quotes"] },
);

/** Premium (+) or discount (−) of an executed fill versus Grail's spot value for the same number of tokens. */
export function impact(usd: number | null, spotUsdForSize: number) {
  return usd == null || spotUsdForSize <= 0 ? null : usd / spotUsdForSize - 1;
}

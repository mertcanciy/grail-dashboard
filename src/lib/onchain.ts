import {
  createPublicClient,
  encodeAbiParameters,
  erc20Abi,
  fallback,
  http,
  keccak256,
  parseAbi,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { base, robinhood } from "viem/chains";
import type { GrailToken } from "./grail/types";

export type OnchainTarget = Pick<GrailToken, "chain_id" | "token_address" | "pool_address" | "v4_pool">;

const clients = new Map<number, PublicClient>();

/** Public, CORS-enabled RPCs. Reads are folded into Multicall3 calls, and viem falls through the list on errors. */
const RPCS: Record<number, string[]> = {
  [base.id]: ["https://base-rpc.publicnode.com", "https://mainnet.base.org", "https://base.drpc.org"],
  [robinhood.id]: [...robinhood.rpcUrls.default.http],
};

function clientFor(chainId: number) {
  let c = clients.get(chainId);
  if (!c) {
    const chain = chainId === robinhood.id ? robinhood : base;
    c = createPublicClient({
      chain,
      batch: { multicall: true },
      transport: fallback(RPCS[chain.id].map((url) => http(url, { retryCount: 1, timeout: 8_000 }))),
    }) as PublicClient;
    clients.set(chainId, c);
  }
  return c;
}

const v3PoolAbi = parseAbi([
  "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16, uint16, uint16, uint8, bool)",
  "function liquidity() view returns (uint128)",
  "function fee() view returns (uint24)",
  "function token0() view returns (address)",
  "function token1() view returns (address)",
]);

const poolManagerAbi = parseAbi(["function extsload(bytes32 slot) view returns (bytes32)"]);

/** Uniswap v4 PoolManager stores `mapping(PoolId => Pool.State) pools` at slot 6. */
const V4_POOLS_SLOT = 6n;

export interface OnchainSnapshot {
  blockNumber: bigint;
  totalSupply: number;
  pool: {
    version: "v3" | "v4";
    feeBps: number;
    tick: number;
    liquidity: bigint;
    quoteSymbol: string;
    /** gToken price denominated in the pool's quote asset. */
    priceInQuote: number;
    /** Only for v3, where the pool contract itself holds reserves. */
    reserves?: { token: number; quote: number };
  } | null;
}

function priceFromSqrt(sqrtPriceX96: bigint, dec0: number, dec1: number, gTokenIsToken0: boolean) {
  const ratio = Number(sqrtPriceX96) / 2 ** 96;
  const token1PerToken0 = ratio * ratio * 10 ** (dec0 - dec1);
  return gTokenIsToken0 ? token1PerToken0 : 1 / token1PerToken0;
}

async function erc20Meta(client: PublicClient, address: Address) {
  const [decimals, symbol] = await Promise.all([
    client.readContract({ address, abi: erc20Abi, functionName: "decimals" }),
    client.readContract({ address, abi: erc20Abi, functionName: "symbol" }).catch(() => "?"),
  ]);
  return { decimals: Number(decimals), symbol };
}

async function readV3(client: PublicClient, token: OnchainTarget): Promise<OnchainSnapshot["pool"]> {
  const pool = token.pool_address as Address;
  const [slot0, liquidity, fee, token0, token1] = await Promise.all([
    client.readContract({ address: pool, abi: v3PoolAbi, functionName: "slot0" }),
    client.readContract({ address: pool, abi: v3PoolAbi, functionName: "liquidity" }),
    client.readContract({ address: pool, abi: v3PoolAbi, functionName: "fee" }),
    client.readContract({ address: pool, abi: v3PoolAbi, functionName: "token0" }),
    client.readContract({ address: pool, abi: v3PoolAbi, functionName: "token1" }),
  ]);
  const gIs0 = token0.toLowerCase() === token.token_address.toLowerCase();
  const quote = gIs0 ? token1 : token0;
  const [m0, m1, balToken, balQuote] = await Promise.all([
    erc20Meta(client, token0),
    erc20Meta(client, token1),
    client.readContract({ address: token.token_address as Address, abi: erc20Abi, functionName: "balanceOf", args: [pool] }),
    client.readContract({ address: quote, abi: erc20Abi, functionName: "balanceOf", args: [pool] }),
  ]);
  const qMeta = gIs0 ? m1 : m0;
  const gMeta = gIs0 ? m0 : m1;
  return {
    version: "v3",
    feeBps: Number(fee) / 100,
    tick: slot0[1],
    liquidity,
    quoteSymbol: qMeta.symbol,
    priceInQuote: priceFromSqrt(slot0[0], m0.decimals, m1.decimals, gIs0),
    reserves: {
      token: Number(balToken) / 10 ** gMeta.decimals,
      quote: Number(balQuote) / 10 ** qMeta.decimals,
    },
  };
}

async function readV4(client: PublicClient, token: OnchainTarget): Promise<OnchainSnapshot["pool"]> {
  const v4 = token.v4_pool!;
  const pm = v4.pool_manager_address as Address;
  const stateSlot = keccak256(
    encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [v4.pool_id as Hex, V4_POOLS_SLOT]),
  );
  const liquiditySlot = `0x${(BigInt(stateSlot) + 3n).toString(16).padStart(64, "0")}` as Hex;
  const { currency0, currency1 } = v4.pool_key;
  const [slot0Word, liquidityWord, m0, m1] = await Promise.all([
    client.readContract({ address: pm, abi: poolManagerAbi, functionName: "extsload", args: [stateSlot] }),
    client.readContract({ address: pm, abi: poolManagerAbi, functionName: "extsload", args: [liquiditySlot] }),
    erc20Meta(client, currency0 as Address),
    erc20Meta(client, currency1 as Address),
  ]);
  const word = BigInt(slot0Word);
  const sqrtPriceX96 = word & ((1n << 160n) - 1n);
  let tick = Number((word >> 160n) & 0xffffffn);
  if (tick >= 0x800000) tick -= 0x1000000;
  const lpFee = Number((word >> 208n) & 0xffffffn);
  const gIs0 = currency0.toLowerCase() === token.token_address.toLowerCase();
  return {
    version: "v4",
    feeBps: lpFee / 100,
    tick,
    liquidity: BigInt(liquidityWord),
    quoteSymbol: (gIs0 ? m1 : m0).symbol,
    priceInQuote: priceFromSqrt(sqrtPriceX96, m0.decimals, m1.decimals, gIs0),
  };
}

export async function readOnchain(token: OnchainTarget): Promise<OnchainSnapshot> {
  const client = clientFor(token.chain_id);
  const [blockNumber, supply, decimals, pool] = await Promise.all([
    client.getBlockNumber(),
    client.readContract({ address: token.token_address as Address, abi: erc20Abi, functionName: "totalSupply" }),
    client.readContract({ address: token.token_address as Address, abi: erc20Abi, functionName: "decimals" }),
    (token.v4_pool ? readV4(client, token) : readV3(client, token)).catch(() => null),
  ]);
  return { blockNumber, totalSupply: Number(supply) / 10 ** Number(decimals), pool };
}

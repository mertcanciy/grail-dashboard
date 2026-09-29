import { cache } from "react";
import { erc20Abi, isAddress, type Address } from "viem";
import { getPacks, getProfileActivity, getProfileHoldings, getProfileOverview, getTokens } from "./grail/api";
import { packDisplayNames, tokensPerItem } from "./grail/meta";
import type { GrailToken } from "./grail/types";
import { clientFor } from "./onchain";

export interface WalletHolding {
  token: GrailToken;
  balance: number;
  usd: number;
  pnlPercent: number | null;
  /** Balance as a fraction of one redeemable item. */
  itemProgress: number;
}

/** Wallets without a Grail account still hold gTokens; read their balances straight from each chain. */
async function onchainBalances(address: Address, tokens: GrailToken[]) {
  const byChain = new Map<number, GrailToken[]>();
  for (const t of tokens) byChain.set(t.chain_id, [...(byChain.get(t.chain_id) ?? []), t]);
  const out = new Map<string, number>();
  await Promise.all(
    [...byChain.entries()].map(async ([chainId, list]) => {
      const results = await clientFor(chainId)
        .multicall({
          allowFailure: true,
          contracts: list.map((t) => ({
            address: t.token_address as Address,
            abi: erc20Abi,
            functionName: "balanceOf" as const,
            args: [address] as const,
          })),
        })
        .catch(() => []);
      results.forEach((r, i) => {
        if (r.status === "success") out.set(list[i].symbol, Number(r.result) / 10 ** list[i].decimals);
      });
    }),
  );
  return out;
}

export const loadWallet = cache(async (raw: string) => {
  const address = raw.toLowerCase();
  if (!isAddress(address)) return null;

  const [{ tokens }, overview, holdings, activity, packs] = await Promise.all([
    getTokens({ timeframe: "1d", windowDays: 1 }),
    getProfileOverview(address).catch(() => null),
    getProfileHoldings(address).catch(() => null),
    getProfileActivity(address, 50).catch(() => null),
    getPacks().catch(() => []),
  ]);
  const bySymbol = new Map(tokens.map((t) => [t.symbol.toLowerCase(), t]));

  let rows: WalletHolding[];
  let source: "grail" | "chain";
  if (holdings) {
    source = "grail";
    rows = holdings.tokens.flatMap((h) => {
      const token = bySymbol.get(h.symbol.toLowerCase()) ?? tokens.find((t) => t.token_id === h.token_id && t.chain_id === h.chain_id);
      if (!token) return [];
      const balance = Number(h.balance_human);
      return [{
        token,
        balance,
        usd: Number(h.usd_value) || balance * (token.market_price ?? 0),
        pnlPercent: h.pnl_percent != null ? Number(h.pnl_percent) : null,
        itemProgress: balance / tokensPerItem(token),
      }];
    });
  } else {
    source = "chain";
    const balances = await onchainBalances(address as Address, tokens);
    rows = tokens.flatMap((token) => {
      const balance = balances.get(token.symbol) ?? 0;
      if (balance <= 1e-9) return [];
      return [{ token, balance, usd: balance * (token.market_price ?? 0), pnlPercent: null, itemProgress: balance / tokensPerItem(token) }];
    });
  }
  rows.sort((a, b) => b.usd - a.usd);

  return {
    address,
    source,
    overview,
    rows,
    totals: {
      tokensUsd: rows.reduce((s, r) => s + r.usd, 0),
      grailAssetsUsd: holdings ? Number(holdings.totals.grail_assets_usd) : null,
      lpUsd: holdings ? Number(holdings.totals.lp_usd) : null,
      redeemableItems: rows.reduce((s, r) => s + Math.floor(r.itemProgress + 1e-9), 0),
    },
    activity: activity?.items ?? [],
    packNames: packDisplayNames(packs),
    tokens,
    now: Date.now(),
  };
});

export type WalletView = NonNullable<Awaited<ReturnType<typeof loadWallet>>>;

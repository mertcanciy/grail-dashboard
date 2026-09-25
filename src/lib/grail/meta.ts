import type { ChainId, GrailToken } from "./types";

export const CHAINS: Record<ChainId, { name: string; short: string; explorer: string; rpc: string }> = {
  8453: {
    name: "Base",
    short: "Base",
    explorer: "https://basescan.org",
    rpc: "https://mainnet.base.org",
  },
  4663: {
    name: "Robinhood Chain",
    short: "Robinhood",
    explorer: "https://robinhoodchain.blockscout.com",
    rpc: "https://rpc.mainnet.chain.robinhood.com",
  },
};

export function chainOf(id: number) {
  return CHAINS[id as ChainId] ?? { name: `Chain ${id}`, short: `${id}`, explorer: "", rpc: "" };
}

export function explorerAddress(chainId: number, address: string) {
  const base = chainOf(chainId).explorer;
  return base ? `${base}/address/${address}` : undefined;
}

export function explorerTx(chainId: number, tx: string) {
  const base = chainOf(chainId).explorer;
  return base ? `${base}/tx/${tx}` : undefined;
}

const PEOPLE: Record<string, string> = {
  WEMBY: "Victor Wembanyama",
  YAMAL: "Lamine Yamal",
  MJ: "Michael Jordan",
  OHTANI: "Shohei Ohtani",
  MBAPPE: "Kylian Mbappé",
  BRADY: "Tom Brady",
  KOBE: "Kobe Bryant",
  CADE: "Cade Cunningham",
  PIKA: "Pikachu",
  CHAR: "Charizard",
  BRON: "LeBron James",
  MONK: "Monkey D. Luffy",
  BRUN: "Jalen Brunson",
  SHAI: "Shai Gilgeous-Alexander",
  SPEED: "IShowSpeed",
  PULI: "Christian Pulisic",
  MESSI: "Lionel Messi",
  DOUE: "Désiré Doué",
  RONALDO: "Cristiano Ronaldo",
  ELON: "Elon Musk",
  SWIFT: "Taylor Swift",
  KIRK: "Charlie Kirk",
  COOP: "Cooper Flagg",
  ALLEN: "Josh Allen",
  KAI: "Kai Cenat",
  VITALIK: "Vitalik Buterin",
  JENSEN: "Jensen Huang",
};

/** Grail's API is inconsistent: most tokens have symbol "gX", a few have name "gX" and symbol "X". */
export function ticker(t: Pick<GrailToken, "symbol" | "name">) {
  const s = t.symbol.trim();
  const n = t.name.trim();
  if (/^g[A-Z0-9]/.test(s)) return s;
  if (/^g[A-Z0-9]/.test(n)) return n;
  return `g${s}`;
}

export function baseTicker(t: Pick<GrailToken, "symbol" | "name">) {
  return ticker(t).slice(1);
}

export function personName(t: Pick<GrailToken, "symbol" | "name">) {
  const base = baseTicker(t);
  return PEOPLE[base] ?? base.charAt(0) + base.slice(1).toLowerCase();
}

/** URL slug; the Grail API accepts the raw symbol case-insensitively. */
export function slugOf(t: Pick<GrailToken, "symbol">) {
  return t.symbol.trim().toLowerCase();
}

/** Primary category, ignoring Grail's cross-cutting "WTM" tag. */
export function categoryOf(t: Pick<GrailToken, "tags">) {
  return t.tags.find((tag) => tag !== "WTM") ?? "Other";
}

export function quoteAssetOf(t: Pick<GrailToken, "peg_ticker">) {
  return t.peg_ticker?.trim() ? t.peg_ticker.trim().toUpperCase() : "USDC";
}

export function poolVersion(t: Pick<GrailToken, "v4_pool">) {
  return t.v4_pool ? "Uniswap v4" : "Uniswap v3";
}

/** gTokens needed to redeem one physical item (largest multiplier among backing reserves). */
export function tokensPerItem(t: Pick<GrailToken, "reserves">) {
  const m = t.reserves.map((r) => r.multiplier).filter((x) => x > 0);
  return m.length ? Math.min(...m) : 10_000;
}

export function vaultedItems(t: Pick<GrailToken, "reserves" | "offchain_collectibles">) {
  const onchain = t.reserves.reduce((s, r) => s + (r.vaulted_cards_count ?? r.backed_supply ?? 0), 0);
  const offchain = t.offchain_collectibles.reduce((s, c) => s + (c.available_items_count ?? 0), 0);
  return { onchain, offchain, total: onchain + offchain };
}

export function grailTradeUrl(t: Pick<GrailToken, "symbol">) {
  return `https://grail.xyz/trade/${slugOf(t)}`;
}

import type { ChainId, GrailToken, Pack, ProfileActivity, Reserve, TokenActivity } from "./types";

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
  VLAD: "Vlad Tenev",
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

const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s-])\p{L}/gu, (m) => m.toUpperCase());

/**
 * Known legends get their full name. New listings fall back to Grail's `name` field, which is often
 * the fuller form of the ticker (gBRUN is named "BRUNSON"), so they still read well before anyone updates this map.
 */
export function personName(t: Pick<GrailToken, "symbol" | "name">) {
  const base = baseTicker(t);
  if (PEOPLE[base]) return PEOPLE[base];
  const name = t.name.trim().replace(/^g(?=[A-Z0-9])/, "");
  return titleCase(name.length >= base.length ? name : base);
}

export const FALLBACK_IMAGE = "/grail-logo.jpg";

export function imageOf(t: Pick<GrailToken, "image_url">) {
  return t.image_url?.trim() || FALLBACK_IMAGE;
}

/**
 * The reserve a holder can redeem most cheaply (lowest multiplier). Tokens backed by several items (gKIRK: a
 * 10,000-token card and a 50,000-token hat) are described by this one everywhere a single item is shown.
 */
export function primaryReserve<R extends Pick<Reserve, "multiplier">>(t: { reserves: R[] }): R | undefined {
  let best: R | undefined;
  for (const r of t.reserves) if (r.multiplier > 0 && (!best || r.multiplier < best.multiplier)) best = r;
  return best ?? t.reserves[0];
}

/** Photo of the primary vaulted item, for slab-style displays. */
export function itemImageOf(t: Pick<GrailToken, "image_url" | "reserves" | "offchain_collectibles">) {
  return (
    primaryReserve(t)?.image_url?.trim() ||
    t.reserves.find((r) => r.image_url?.trim())?.image_url ||
    t.offchain_collectibles.find((c) => c.image_url?.trim())?.image_url ||
    imageOf(t)
  );
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

/** gTokens needed to redeem the cheapest physical item (smallest multiplier among backing reserves). */
export function tokensPerItem(t: Pick<GrailToken, "reserves">) {
  const m = primaryReserve(t)?.multiplier ?? 0;
  return m > 0 ? m : 10_000;
}

export function vaultedItems(t: Pick<GrailToken, "reserves" | "offchain_collectibles">) {
  const onchain = t.reserves.reduce((s, r) => s + (r.vaulted_cards_count ?? r.backed_supply ?? 0), 0);
  const offchain = t.offchain_collectibles.reduce((s, c) => s + (c.available_items_count ?? 0), 0);
  return { onchain, offchain, total: onchain + offchain };
}

export function grailTradeUrl(t: Pick<GrailToken, "symbol">) {
  return `https://grail.xyz/trade/${slugOf(t)}`;
}

/** Grail's own operational wallets; they hold inventory, not collector positions. */
const GRAIL_WALLET_NAMES = new Set(["grailadmin"]);

export function isGrailWallet(name: string | null | undefined) {
  return !!name && GRAIL_WALLET_NAMES.has(name.trim().toLowerCase());
}

/** Labels for token activity types (`tokens/{symbol}/activity`). */
export const ACTIVITY_LABELS: Record<string, string> = {
  BUY: "Buy",
  SELL: "Sell",
  LP_ADD: "Add liquidity",
  LP_REMOVE: "Remove liquidity",
  LP_FEE_COLLECT: "Collect fees",
  PACK_CLAIM: "Pack claim",
  PACK_NFT_BUY: "Pack NFT buy",
  PACK_NFT_SELL: "Pack NFT sell",
  PACK_NFT_TRANSFER_IN: "Pack NFT in",
  PACK_NFT_TRANSFER_OUT: "Pack NFT out",
};

/** Labels for wallet activity kinds (`profile/{id}/activity`). */
export const PROFILE_ACTIVITY_LABELS: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  pack_claim: "Pack claim",
  pack_purchase: "Pack purchase",
  pack_open: "Opened pack",
  achievement: "Achievement",
  lp_add: "Add liquidity",
  lp_remove: "Remove liquidity",
  redeem: "Redeem",
};

const humanize = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\p{L}/u, (m) => m.toUpperCase());

export function activityLabel(type: string) {
  return ACTIVITY_LABELS[type] ?? humanize(type);
}

export function profileActivityLabel(kind: string) {
  const k = kind.toLowerCase();
  return PROFILE_ACTIVITY_LABELS[k] ?? ACTIVITY_LABELS[k.toUpperCase()] ?? humanize(k);
}

/** A wallet's rows from the public per-token activity feeds, shaped like `profile/{id}/activity` rows, newest first. */
export function walletActivityFromFeed(
  events: TokenActivity[],
  address: string,
  tokens: Pick<GrailToken, "symbol" | "chain_id">[],
): ProfileActivity[] {
  const chainOf = new Map(tokens.map((t) => [t.symbol, t.chain_id]));
  const wallet = address.toLowerCase();
  return events
    .filter((e) => e.address.toLowerCase() === wallet && chainOf.has(e.symbol))
    .sort((a, b) => Date.parse(b.block_timestamp) - Date.parse(a.block_timestamp))
    .map((e) => ({
      chain_id: chainOf.get(e.symbol)!,
      kind: e.type.toLowerCase(),
      timestamp: e.block_timestamp,
      token_symbol: e.symbol,
      token_name: null,
      amount_usdc: e.usd_value ?? null,
      side: e.type === "BUY" || e.type === "SELL" ? e.type.toLowerCase() : null,
      price: e.price != null ? Number(e.price) : null,
      token_amount: Number(e.token_amount),
      tx_hash: e.tx_hash,
      image_url: null,
    }));
}

/** What a wallet activity row is about when it has no token: the achievement or pack name. */
/** `packNames` maps pack ids to catalog names (see `packDisplayNames`); unknown ids fall back to `humanizePack`. */
export function profileActivitySubject(
  a: Pick<ProfileActivity, "kind" | "detail" | "token_name" | "token_symbol">,
  packNames?: ReadonlyMap<string, string>,
) {
  const detail = a.detail?.trim();
  if (detail) return a.kind.toLowerCase() === "pack_open" ? (packNames?.get(detail) ?? humanizePack(detail)) : detail;
  return a.token_name ?? a.token_symbol ?? "";
}

const PACK_WORDS = ["FOUNDERS", "FOUNDER", "PACKS", "PACK", "VERIFIED", "LEGEND", "GENESIS", "LAUNCH", "EXPANSION", "SERIES", "GOAT", "OG"];
const PACK_ACRONYMS = new Set(["GOAT", "OG"]);

/** Splits a run-together pack id into known words; `rest` is whatever didn't match. */
function packWords(id: string) {
  let rest = id;
  const words: string[] = [];
  for (let w = PACK_WORDS.find((x) => rest.startsWith(x)); w; w = PACK_WORDS.find((x) => rest.startsWith(x))) {
    words.push(w);
    rest = rest.slice(w.length);
  }
  return { words, rest };
}

const titleWord = (w: string) => (PACK_ACRONYMS.has(w) ? w : w.charAt(0) + w.slice(1).toLowerCase());

/** Grail pack ids are run together in capitals ("FOUNDERPACKSVERIFIEDLEGEND"); split the common words out. */
export function humanizePack(id: string) {
  if (/[a-z\s]/.test(id)) return id;
  const { words, rest } = packWords(id);
  return [...words, ...(rest ? [rest] : [])].map(titleWord).join(" ");
}

/**
 * Pack id → name from Grail's pack catalog. Several ids can share one catalog name (the four Founder tiers are all
 * "Founder Series #1"); those get the tier from the id when it splits cleanly.
 */
export function packDisplayNames(packs: Pick<Pack, "pack_id" | "display_name">[]) {
  const uses = new Map<string, number>();
  for (const p of packs) uses.set(p.display_name, (uses.get(p.display_name) ?? 0) + 1);
  return new Map(
    packs.map((p) => {
      const name = p.display_name.trim();
      if ((uses.get(p.display_name) ?? 0) < 2) return [p.pack_id, name] as const;
      const inName = new Set(name.toUpperCase().split(/\s+/));
      const { words, rest } = packWords(p.pack_id);
      const tier = words.filter((w) => w !== "PACK" && w !== "PACKS" && !inName.has(w) && !inName.has(w.replace(/S$/, "")));
      return [p.pack_id, !rest && tier.length ? `${name} · ${tier.map(titleWord).join(" ")}` : name] as const;
    }),
  );
}

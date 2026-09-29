import { getHolders, getLeaderboard, getTokenVault, getTokens, mapLimit } from "./grail/api";
import { personName, slugOf, ticker } from "./grail/meta";
import { getMarketSnapshot } from "./market";
import { certLink, shortAddress } from "./metrics";

export type SearchKind = "token" | "wallet" | "item" | "contract";

/** Compact on purpose: this ships to the browser the first time someone opens search. */
export interface SearchEntry {
  /** kind */
  k: SearchKind;
  /** label */
  l: string;
  /** secondary line */
  s?: string;
  /** href (internal path or external URL) */
  h: string;
  /** extra lowercase search terms */
  q?: string;
  /** image */
  i?: string;
}

export async function buildSearchIndex(): Promise<SearchEntry[]> {
  const { tokens } = await getTokens({ timeframe: "1d", windowDays: 1 });
  const [vaults, holders, board, snap] = await Promise.all([
    mapLimit(tokens, 6, (t) => getTokenVault(t)),
    mapLimit(tokens, 6, (t) => getHolders(t.symbol, 50).catch(() => null)),
    getLeaderboard("all_time", "total", 50).catch(() => null),
    getMarketSnapshot().catch(() => null),
  ]);

  const entries: SearchEntry[] = [];

  tokens.forEach((t, i) => {
    const href = `/tokens/${slugOf(t)}`;
    entries.push({
      k: "token",
      l: ticker(t),
      s: personName(t),
      h: href,
      q: [t.symbol, t.name, ...t.tags, ...t.reserves.map((r) => r.name)].join(" ").toLowerCase(),
      i: t.image_url || undefined,
    });
    const contracts: [string, string][] = [
      [t.token_address, `${ticker(t)} token contract`],
      [t.pool_address, `${ticker(t)} pool`],
      ...t.reserves.map((r) => [r.reserve_address, `${ticker(t)} vault reserve`] as [string, string]),
    ];
    for (const [addr, label] of contracts) {
      if (addr) entries.push({ k: "contract", l: label, s: shortAddress(addr), h: href, q: addr.toLowerCase() });
    }
    const v = vaults[i];
    for (const r of t.reserves) {
      for (const it of v.reserves[r.symbol] ?? []) {
        const cert = certLink(it.reference_id, r.name);
        entries.push({
          k: "item",
          l: cert ? `${cert.grader} ${it.reference_id}` : it.reference_id,
          s: `${ticker(t)}, ${r.name.trim()}`,
          h: `${href}#vault`,
          q: it.reference_id.toLowerCase(),
        });
      }
    }
  });

  const wallets = new Map<string, string>();
  const addWallet = (address: string, name: string | null | undefined) => {
    const a = address.toLowerCase();
    if (!wallets.has(a) || (name && !/^0x[0-9a-f]{4,}/i.test(name))) wallets.set(a, name || shortAddress(a));
  };
  for (const h of holders) for (const r of h?.results ?? []) addWallet(r.address, r.username ?? r.display_name);
  for (const e of board?.entries ?? []) addWallet(e.wallet_address, e.username ?? e.label);
  for (const b of snap?.topBuyers ?? []) addWallet(b.key, b.label);

  for (const [address, name] of wallets) {
    entries.push({ k: "wallet", l: name, s: shortAddress(address), h: `/address/${address}`, q: address });
  }
  return entries;
}

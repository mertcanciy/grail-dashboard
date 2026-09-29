import { getHolders, getTokenVault, getTokens, mapLimit } from "./grail/api";
import { isGrailWallet, tokensPerItem, vaultedItems } from "./grail/meta";
import type { GrailToken, VaultItem } from "./grail/types";
import { redeemCandidates, supplyBacking, type RedeemCandidate } from "./metrics";

export interface RegistryRow {
  token: GrailToken;
  items: number;
  listed: number;
  fullyBacked: boolean;
  redeemers: number;
}

export interface RecentItem extends VaultItem {
  token: GrailToken;
  itemName: string;
}

export async function loadVault() {
  const { tokens } = await getTokens({ timeframe: "1d", windowDays: 1 });

  const perToken = await mapLimit(tokens, 6, async (token) => {
    const [vault, holders] = await Promise.all([getTokenVault(token), getHolders(token.symbol, 50).catch(() => null)]);
    return { token, vault, holders: holders?.results ?? [] };
  });

  const registry: RegistryRow[] = [];
  const redeemers: (RedeemCandidate & { token: GrailToken })[] = [];
  const recent: RecentItem[] = [];

  for (const { token, vault, holders } of perToken) {
    const cands = redeemCandidates(holders, tokensPerItem(token), 1);
    redeemers.push(...cands.map((c) => ({ ...c, token })));
    let listed = 0;
    for (const r of token.reserves) {
      const items = vault.reserves[r.symbol] ?? [];
      listed += items.length;
      recent.push(...items.map((it) => ({ ...it, token, itemName: r.name.trim() })));
    }
    for (const c of token.offchain_collectibles) {
      const items = vault.offchain[c.collectible_id] ?? [];
      listed += items.length;
      recent.push(...items.map((it) => ({ ...it, chain_id: token.chain_id, token, itemName: c.name.trim() })));
    }
    registry.push({ token, items: vaultedItems(token).total, listed, fullyBacked: supplyBacking(token).fullyBacked, redeemers: cands.length });
  }

  registry.sort((a, b) => Number(b.token.market_cap) - Number(a.token.market_cap));
  redeemers.sort((a, b) => b.usd - a.usd);
  const collectors = redeemers.filter((r) => !isGrailWallet(r.name));
  const grailHeld = redeemers.filter((r) => isGrailWallet(r.name)).reduce((s, r) => s + r.items, 0);
  recent.sort((a, b) => Date.parse(b.registered_at ?? "0") - Date.parse(a.registered_at ?? "0"));

  return {
    registry,
    redeemers: collectors,
    grailHeld,
    recent: recent.slice(0, 12),
    totals: {
      items: registry.reduce((s, r) => s + r.items, 0),
      listed: registry.reduce((s, r) => s + r.listed, 0),
      backed: registry.filter((r) => r.fullyBacked).length,
      tokens: registry.length,
      vaultValue: tokens.reduce((s, t) => s + Number(t.market_cap || 0), 0),
      redeemableItems: collectors.reduce((s, r) => s + r.items, 0),
    },
    now: Date.now(),
  };
}

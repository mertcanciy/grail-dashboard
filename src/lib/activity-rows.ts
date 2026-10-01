import type { GrailToken, ProfileActivity } from "./grail/types";
import { explorerTx, profileActivityLabel, profileActivitySubject, slugOf, ticker } from "./grail/meta";

/** How far back wallets without readable Grail activity are searched in the public token feeds. */
export const WALLET_FEED_DAYS = 7;

export interface ActivityRow {
  key: string;
  kind: string;
  label: string;
  ticker: string | null;
  href: string | null;
  subject: string;
  usd: number | null;
  timestamp: string;
  txUrl: string | null;
}

export function toActivityRows(
  items: ProfileActivity[],
  tokens: Pick<GrailToken, "symbol" | "name">[],
  packNames?: ReadonlyMap<string, string>,
  limit = 25,
): ActivityRow[] {
  const bySymbol = new Map(tokens.map((t) => [t.symbol.toLowerCase(), t]));
  return items.slice(0, limit).map((a, i) => {
    const t = a.token_symbol ? bySymbol.get(a.token_symbol.toLowerCase()) : undefined;
    const kind = a.kind.toLowerCase();
    const usd = a.amount_usdc ? Number(a.amount_usdc) : NaN;
    return {
      key: `${a.tx_hash ?? kind}-${i}`,
      kind,
      label: profileActivityLabel(kind),
      ticker: t ? ticker(t) : null,
      href: t ? `/tokens/${slugOf(t)}` : null,
      subject: t ? "" : profileActivitySubject(a, packNames),
      usd: Number.isFinite(usd) ? usd : null,
      timestamp: a.timestamp,
      txUrl: (a.tx_hash && explorerTx(a.chain_id, a.tx_hash)) || null,
    };
  });
}

export type FeedStatus = "ok" | "incomplete" | "unavailable";

/** "unavailable" when no token feed answered at all, "incomplete" when some failed or were cut short. */
export function feedStatus(
  coverage: { failed: string[]; interrupted: string[]; truncated: string[] },
  tokenCount: number,
): FeedStatus {
  if (coverage.failed.length >= tokenCount) return "unavailable";
  return coverage.failed.length + coverage.interrupted.length + coverage.truncated.length > 0 ? "incomplete" : "ok";
}

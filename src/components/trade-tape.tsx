import Link from "next/link";
import type { Activity, GrailToken, TokenActivity } from "@/lib/grail/types";
import { explorerTx, ticker } from "@/lib/grail/meta";
import { formatTokenAmount, formatUsd, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
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

export function TradeTape({
  events,
  tokens,
  chainId,
  now,
  showToken = true,
}: {
  events: (Activity | TokenActivity)[];
  tokens?: GrailToken[];
  chainId?: number;
  now: number;
  showToken?: boolean;
}) {
  const bySymbol = new Map((tokens ?? []).map((t) => [t.symbol, t]));
  if (!events.length) return <p className="py-8 text-center text-sm text-slate">No activity in this window.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-xs text-slate">
            <th className="py-2 pr-3 font-medium">Action</th>
            {showToken && <th className="py-2 pr-3 font-medium">gToken</th>}
            <th className="py-2 pr-3 font-medium">Wallet</th>
            <th className="py-2 pr-3 text-right font-medium">Value</th>
            <th className="py-2 pr-3 text-right font-medium">Amount</th>
            <th className="py-2 text-right font-medium">When</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">
          {events.map((e) => {
            const t = "symbol" in e ? bySymbol.get(e.symbol) : undefined;
            const txUrl = explorerTx(t?.chain_id ?? chainId ?? 8453, e.tx_hash);
            return (
              <tr key={`${e.tx_hash}-${e.log_index}-${e.type}`} className="transition-colors hover:bg-mist/70">
                <td className="py-2.5 pr-3">
                  <span
                    className={cn(
                      "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                      e.type === "BUY" && "bg-up/10 text-up",
                      e.type === "SELL" && "bg-down/10 text-down",
                      e.type !== "BUY" && e.type !== "SELL" && "bg-muted text-slate",
                    )}
                  >
                    {LABELS[e.type] ?? e.type}
                  </span>
                </td>
                {showToken && (
                  <td className="py-2.5 pr-3 font-medium">
                    {t ? (
                      <Link href={`/tokens/${t.symbol.toLowerCase()}`} className="hover:text-gold-ink">
                        {ticker(t)}
                      </Link>
                    ) : (
                      "symbol" in e && e.symbol
                    )}
                  </td>
                )}
                <td className="max-w-40 truncate py-2.5 pr-3 text-slate">{e.username ?? e.display_name}</td>
                <td className="tabular py-2.5 pr-3 text-right font-medium">{formatUsd(Number(e.usd_value ?? 0))}</td>
                <td className="tabular py-2.5 pr-3 text-right text-slate">{formatTokenAmount(e.token_amount)}</td>
                <td className="py-2.5 text-right text-slate">
                  {txUrl ? (
                    <a href={txUrl} target="_blank" rel="noreferrer" className="hover:text-graphite" title="View transaction">
                      {timeAgo(e.block_timestamp, now)}
                    </a>
                  ) : (
                    timeAgo(e.block_timestamp, now)
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

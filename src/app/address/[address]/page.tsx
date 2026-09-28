import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { loadWallet } from "@/lib/wallet";
import { CHAINS, explorerAddress, explorerTx, imageOf, personName, slugOf, ticker } from "@/lib/grail/meta";
import { shortAddress } from "@/lib/metrics";
import { formatDate, formatNumber, formatShare, formatTokenAmount, formatUsd, timeAgo } from "@/lib/format";
import { AddressRow } from "@/components/address-row";
import { Change } from "@/components/change";
import { cn } from "@/lib/utils";

export const revalidate = 120;

/** No wallets are prerendered; each one renders on its first visit and is then cached for two minutes. */
export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: PageProps<"/address/[address]">): Promise<Metadata> {
  const { address } = await props.params;
  const w = await loadWallet(address);
  if (!w) return { title: "Wallet not found" };
  const name = w.overview?.username ?? shortAddress(w.address);
  return {
    title: `${name} holdings`,
    description: `${name} holds ${formatUsd(w.totals.tokensUsd, { compact: true })} across ${w.rows.length} gTokens.`,
  };
}

const KIND_LABEL: Record<string, string> = {
  buy: "Buy",
  sell: "Sell",
  pack_claim: "Pack claim",
  pack_purchase: "Pack purchase",
  lp_add: "Add liquidity",
  lp_remove: "Remove liquidity",
  redeem: "Redeem",
};

export default async function WalletPage(props: PageProps<"/address/[address]">) {
  const { address } = await props.params;
  const w = await loadWallet(address);
  if (!w) notFound();
  const name = w.overview?.username ?? w.overview?.display_name ?? shortAddress(w.address);
  const bySymbol = new Map(w.tokens.map((t) => [t.symbol.toLowerCase(), t]));

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <span className="relative size-16 shrink-0 overflow-hidden rounded-2xl bg-gold-wash">
            {w.overview?.avatar_url ? (
              <Image src={w.overview.avatar_url} alt="" fill sizes="64px" className="object-cover" />
            ) : (
              <span className="grid size-full place-items-center font-display text-2xl font-semibold text-gold-ink">
                {name.replace(/^0x/, "").charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-display text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{name}</h1>
            <p className="mt-1 text-sm text-slate">
              {w.overview
                ? `Grail member${w.overview.joined_at ? ` since ${formatDate(w.overview.joined_at)}` : ""}`
                : "No Grail account. Balances read directly from the chain."}
              {w.overview?.twitter_username && (
                <>
                  {", "}
                  <a href={`https://x.com/${w.overview.twitter_username}`} target="_blank" rel="noreferrer" className="hover:text-graphite">
                    @{w.overview.twitter_username}
                  </a>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="w-full max-w-sm divide-y divide-hairline rounded-2xl border border-hairline bg-paper px-4">
          <AddressRow label="Wallet" value={w.address} />
          <div className="flex flex-wrap gap-x-4 gap-y-1 py-2.5 text-sm">
            {[8453, 4663].map((id) => (
              <a key={id} href={explorerAddress(id, w.address)} target="_blank" rel="noreferrer" className="text-slate hover:text-graphite">
                {CHAINS[id as keyof typeof CHAINS].name} explorer
              </a>
            ))}
          </div>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-hairline bg-hairline shadow-[var(--shadow-soft)] sm:grid-cols-4">
        {(
          [
            ["gToken holdings", formatUsd(w.totals.tokensUsd, { compact: true })],
            ["gTokens held", formatNumber(w.rows.length)],
            ["Items it could redeem", formatNumber(w.totals.redeemableItems)],
            ["Liquidity positions", w.totals.lpUsd != null ? formatUsd(w.totals.lpUsd, { compact: true }) : "—"],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="bg-paper px-5 py-4">
            <dt className="text-[13px] text-slate">{label}</dt>
            <dd className="tabular mt-1 font-display text-[26px] font-semibold tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-4 sm:p-6" aria-labelledby="holdings-title">
          <h2 id="holdings-title" className="font-display text-xl font-semibold tracking-tight">
            Holdings
          </h2>
          {w.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate">This wallet doesn&apos;t hold any gTokens right now.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-hairline text-left text-xs text-slate">
                    <th className="py-2 font-medium">gToken</th>
                    <th className="py-2 text-right font-medium">Balance</th>
                    <th className="py-2 text-right font-medium">Value</th>
                    {w.source === "grail" && <th className="py-2 text-right font-medium">PnL</th>}
                    <th className="py-2 pl-4 font-medium">Toward one item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-hairline">
                  {w.rows.map((r) => (
                    <tr key={r.token.symbol}>
                      <td className="py-2.5">
                        <Link href={`/tokens/${slugOf(r.token)}`} className="flex items-center gap-2.5 hover:text-gold-ink">
                          <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image src={imageOf(r.token)} alt="" fill sizes="32px" className="object-cover" />
                          </span>
                          <span>
                            <span className="block font-medium">{ticker(r.token)}</span>
                            <span className="block text-xs text-slate">{personName(r.token)}</span>
                          </span>
                        </Link>
                      </td>
                      <td className="tabular py-2.5 text-right">{formatTokenAmount(r.balance)}</td>
                      <td className="tabular py-2.5 text-right font-medium">{formatUsd(r.usd, { compact: true })}</td>
                      {w.source === "grail" && (
                        <td className="py-2.5 text-right">
                          <Change value={r.pnlPercent} />
                        </td>
                      )}
                      <td className="py-2.5 pl-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-24 rounded-full bg-muted">
                            <div
                              className={cn("h-full rounded-full", r.itemProgress >= 1 ? "bg-up" : "bg-gold")}
                              style={{ width: `${Math.min(100, r.itemProgress * 100)}%` }}
                            />
                          </div>
                          <span className="tabular text-xs text-slate">
                            {r.itemProgress >= 1
                              ? `${Math.floor(r.itemProgress + 1e-9)} redeemable`
                              : formatShare(r.itemProgress)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel p-4 sm:p-6" aria-labelledby="activity-title">
          <h2 id="activity-title" className="font-display text-xl font-semibold tracking-tight">
            Recent activity
          </h2>
          {w.activity.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate">
              {w.source === "grail" ? "No recent activity." : "Activity history is only available for Grail accounts."}
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-hairline">
              {w.activity.slice(0, 25).map((a, i) => {
                const t = a.token_symbol ? bySymbol.get(a.token_symbol.toLowerCase()) : undefined;
                const kind = a.kind.toLowerCase();
                const tx = a.tx_hash ? explorerTx(a.chain_id, a.tx_hash) : undefined;
                return (
                  <li key={`${a.tx_hash}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
                          kind === "buy" ? "bg-up/10 text-up" : kind === "sell" ? "bg-down/10 text-down" : "bg-muted text-slate",
                        )}
                      >
                        {KIND_LABEL[kind] ?? kind.replace(/_/g, " ")}
                      </span>
                      {t ? (
                        <Link href={`/tokens/${slugOf(t)}`} className="truncate font-medium hover:text-gold-ink">
                          {ticker(t)}
                        </Link>
                      ) : (
                        <span className="truncate">{a.token_name ?? a.token_symbol ?? ""}</span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-3">
                      <span className="tabular font-medium">{a.amount_usdc ? formatUsd(Number(a.amount_usdc)) : ""}</span>
                      {tx ? (
                        <a href={tx} target="_blank" rel="noreferrer" className="w-20 text-right text-xs text-slate hover:text-graphite">
                          {timeAgo(a.timestamp, w.now)}
                        </a>
                      ) : (
                        <span className="w-20 text-right text-xs text-slate">{timeAgo(a.timestamp, w.now)}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

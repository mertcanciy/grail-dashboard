import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CircleAlert, CircleCheck, ShieldCheck } from "lucide-react";
import { loadVault } from "@/lib/vault-view";
import { FALLBACK_IMAGE, imageOf, personName, slugOf, ticker } from "@/lib/grail/meta";
import { certLink, shortAddress } from "@/lib/metrics";
import { formatDate, formatNumber, formatUsd } from "@/lib/format";
import { Freshness } from "@/components/freshness";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Proof of vault",
  description: "Every graded card and item behind Grail's gTokens, with certificate numbers, on-chain registrations and supply checks.",
};

export default async function VaultPage() {
  const v = await loadVault();

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
      <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Proof of vault</h1>
      <Freshness at={v.now} maxAgeSec={revalidate} className="mt-3" />
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate">
        What&apos;s actually sitting in Grail&apos;s vault, item by item. Each piece has a grading certificate you can check
        with the grader and an on-chain registration, and every gToken&apos;s supply should equal exactly what its items mint.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-hairline bg-hairline shadow-[var(--shadow-soft)] sm:grid-cols-4">
        {(
          [
            ["Items in the vault", formatNumber(v.totals.items)],
            ["Listed item by item", formatNumber(v.totals.listed)],
            ["gTokens fully backed", `${v.totals.backed} of ${v.totals.tokens}`],
            ["Items collectors could redeem", formatNumber(v.totals.redeemableItems)],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="bg-paper px-5 py-4">
            <dt className="text-[13px] text-slate">{label}</dt>
            <dd className="tabular mt-1 font-display text-[26px] font-semibold tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>
      {v.totals.unavailable > 0 && (
        <p className="mt-3 text-sm text-gold-ink">
          Grail&apos;s item lists for {v.totals.unavailable} {v.totals.unavailable === 1 ? "reserve" : "reserves"} didn&apos;t
          load, so &ldquo;Listed item by item&rdquo; is short by those items.
        </p>
      )}

      <section className="mt-10" aria-labelledby="recent-title">
        <h2 id="recent-title" className="font-display text-2xl font-semibold tracking-tight">
          Recently vaulted
        </h2>
        <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {v.recent.map((it, i) => {
            const cert = certLink(it.reference_id, it.itemName);
            return (
              <li key={`${it.reference_id}-${i}`} className="panel overflow-hidden">
                <Link href={`/tokens/${slugOf(it.token)}#vault`} className="block">
                  <div className="relative aspect-[3/4] bg-[radial-gradient(120%_80%_at_50%_0%,#ffffff_0%,#eef0f4_70%)]">
                    <Image src={it.image_url || FALLBACK_IMAGE} alt={it.itemName} fill sizes="200px" className="object-contain p-2.5" />
                  </div>
                </Link>
                <div className="space-y-0.5 p-3 text-xs">
                  <Link href={`/tokens/${slugOf(it.token)}#vault`} className="block font-medium text-graphite hover:text-gold-ink">
                    {ticker(it.token)}
                  </Link>
                  {cert ? (
                    <a href={cert.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-slate hover:text-graphite">
                      <ShieldCheck className="size-3.5 text-up" aria-hidden="true" />
                      {cert.grader} {it.reference_id}
                    </a>
                  ) : (
                    <span className="block truncate text-slate">{it.reference_id}</span>
                  )}
                  {it.registered_at && <span className="block text-slate">{formatDate(it.registered_at)}</span>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section className="panel p-4 sm:p-6" aria-labelledby="registry-title">
          <h2 id="registry-title" className="font-display text-xl font-semibold tracking-tight">
            Vault registry
          </h2>
          <p className="mt-1 text-sm text-slate">Supply check compares circulating tokens with vaulted items times tokens per item.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-slate">
                  <th className="py-2 font-medium">gToken</th>
                  <th className="py-2 text-right font-medium">Items</th>
                  <th className="py-2 text-right font-medium">Listed</th>
                  <th className="py-2 text-right font-medium">Value</th>
                  <th className="py-2 pl-4 font-medium">Supply</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {v.registry.map((r) => (
                  <tr key={r.token.symbol}>
                    <td className="py-2.5">
                      <Link href={`/tokens/${slugOf(r.token)}#vault`} className="flex items-center gap-2.5 hover:text-gold-ink">
                        <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                          <Image src={imageOf(r.token)} alt="" fill sizes="32px" className="object-cover" />
                        </span>
                        <span>
                          <span className="block font-medium">{ticker(r.token)}</span>
                          <span className="block text-xs text-slate">{personName(r.token)}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="tabular py-2.5 text-right">{r.items}</td>
                    <td className="tabular py-2.5 text-right text-slate">{r.listed}</td>
                    <td className="tabular py-2.5 text-right">{formatUsd(Number(r.token.market_cap), { compact: true })}</td>
                    <td className="py-2.5 pl-4">
                      {r.fullyBacked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-up">
                          <CircleCheck className="size-3.5" aria-hidden="true" /> Backed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-ink">
                          <CircleAlert className="size-3.5" aria-hidden="true" /> Differs
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel h-fit p-5 sm:p-6" aria-labelledby="redeemers-title">
          <h2 id="redeemers-title" className="font-display text-xl font-semibold tracking-tight">
            Wallets that could redeem today
          </h2>
          <p className="mt-1 text-sm text-slate">
            Collectors holding enough tokens to claim a physical item on their own, across every gToken.
            {v.grailHeld > 0 && ` Grail's own admin wallet also holds enough for ${v.grailHeld} items; it's left out here.`}
          </p>
          {v.redeemers.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate">No wallet holds a full item&apos;s worth right now.</p>
          ) : (
            <ul className="mt-4 divide-y divide-hairline">
              {v.redeemers.slice(0, 15).map((c) => (
                <li key={`${c.token.symbol}-${c.address}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <Link href={`/address/${c.address}`} className="min-w-0 hover:text-gold-ink">
                    <span className="block truncate font-medium">{c.name}</span>
                    <span className="block text-xs text-slate">{shortAddress(c.address)}</span>
                  </Link>
                  <span className="text-right">
                    <span className="block font-medium">
                      {c.items} × {ticker(c.token)}
                    </span>
                    <span className="tabular block text-xs text-slate">{formatUsd(c.usd, { compact: true })}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

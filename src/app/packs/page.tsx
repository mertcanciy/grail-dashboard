import type { Metadata } from "next";
import Image from "next/image";
import { getPacks } from "@/lib/grail/api";
import { chainOf } from "@/lib/grail/meta";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";
import type { Pack } from "@/lib/grail/types";

export const revalidate = 900;

export const metadata: Metadata = {
  title: "Packs",
  description: "Every Grail digital pack series: price, how many have sold and what's left.",
};

const KINDS: Record<string, { label: string; body: string }> = {
  GENESIS: { label: "Genesis", body: "Three NFTs per pack with exposure to two high-value PSA 10 cards." },
  LAUNCH: { label: "Launch", body: "One NFT per pack, redeemable for gTokens of a newly vaulted legend." },
  FOUNDER: { label: "Founder", body: "Tiered series for Grail's earliest supporters." },
  EXPANSION: { label: "Expansion", body: "Themed series that widen an existing set." },
};

function sold(p: Pack) {
  return Math.max(0, p.total_initial_units - p.total_remaining_units);
}

export default async function PacksPage() {
  const packs = await getPacks();
  const totalSold = packs.reduce((s, p) => s + sold(p), 0);
  const revenue = packs.reduce((s, p) => s + sold(p) * Number(p.usdc_price || 0), 0);
  const soldOut = packs.filter((p) => p.total_initial_units > 0 && p.total_remaining_units === 0).length;
  const groups = Object.keys(KINDS)
    .map((kind) => ({ kind, packs: packs.filter((p) => p.pack_kind === kind) }))
    .filter((g) => g.packs.length);

  return (
    <div className="mx-auto max-w-7xl px-5 pt-10 sm:px-8 sm:pt-14">
      <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Packs</h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-slate">
        Packs are how many collectors get their first gTokens. Each one holds NFTs that open into tokens backed by real
        vaulted cards.
      </p>

      <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-hairline bg-hairline shadow-[var(--shadow-soft)] sm:grid-cols-4">
        {(
          [
            ["Series released", formatNumber(packs.length)],
            ["Packs sold", formatNumber(totalSold)],
            ["Sold out", `${soldOut} of ${packs.length}`],
            ["Pack sales, at list price", formatUsd(revenue, { compact: true })],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="bg-paper px-5 py-4">
            <dt className="text-[13px] text-slate">{label}</dt>
            <dd className="tabular mt-1 font-display text-[26px] font-semibold tracking-tight">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 space-y-12">
        {groups.map((g) => (
          <section key={g.kind} aria-labelledby={`kind-${g.kind}`}>
            <h2 id={`kind-${g.kind}`} className="font-display text-2xl font-semibold tracking-tight">
              {KINDS[g.kind].label} packs
            </h2>
            <p className="mt-1 text-[15px] text-slate">{KINDS[g.kind].body}</p>
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {g.packs.map((p) => {
                const s = sold(p);
                const share = p.total_initial_units ? s / p.total_initial_units : 0;
                return (
                  <li key={p.pack_id} className="panel overflow-hidden">
                    <div className="relative aspect-[4/3] bg-[radial-gradient(120%_80%_at_50%_0%,#ffffff_0%,#eef0f4_60%,#e4e7ed_100%)]">
                      {p.image_url && (
                        <Image src={p.image_url} alt={p.display_name} fill sizes="(min-width:1280px) 300px, 50vw" className="object-contain p-4" />
                      )}
                      {p.total_remaining_units === 0 && (
                        <span className="absolute left-3 top-3 rounded-full bg-graphite px-2.5 py-1 text-xs font-medium text-paper">Sold out</span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-medium leading-snug">{p.display_name}</h3>
                        <span className="tabular shrink-0 font-semibold">{formatUsd(Number(p.usdc_price))}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate">
                        {chainOf(p.chain_id).name}
                        {p.pack_artist ? `, art by ${p.pack_artist}` : ""}
                        {p.gated ? ", allowlist only" : ""}
                      </p>
                      <div className="mt-3 h-1.5 rounded-full bg-muted">
                        <div className="h-full rounded-full bg-gold" style={{ width: `${share * 100}%` }} />
                      </div>
                      <p className="tabular mt-1.5 text-xs text-slate">
                        {formatNumber(s)} of {formatNumber(p.total_initial_units)} sold ({formatShare(share)})
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

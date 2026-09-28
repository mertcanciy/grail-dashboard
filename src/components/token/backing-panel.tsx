import Image from "next/image";
import { CircleAlert, CircleCheck } from "lucide-react";
import type { TokenView } from "@/lib/token-view";
import { FALLBACK_IMAGE, ticker } from "@/lib/grail/meta";
import { formatNumber, formatUsd } from "@/lib/format";
import { SlabGrid } from "./slab-grid";

export function BackingPanel({ view }: { view: TokenView }) {
  const { token, vault, backing } = view;
  const price = token.market_price ?? 0;
  const items = [
    ...token.reserves.map((r) => ({
      key: `r-${r.reserve_id}`,
      name: r.name.trim(),
      image: r.image_url || FALLBACK_IMAGE,
      category: r.category,
      pop: r.psa_pop,
      perItem: r.multiplier,
      count: r.vaulted_cards_count ?? r.backed_supply,
      slabs: vault.reserves[r.symbol] ?? [],
      chainId: r.chain_id,
    })),
    ...token.offchain_collectibles.map((c) => ({
      key: `o-${c.collectible_id}`,
      name: c.name.trim(),
      image: c.image_url || FALLBACK_IMAGE,
      category: c.category,
      pop: c.psa_pop,
      perItem: null,
      count: c.available_items_count,
      slabs: vault.offchain[c.collectible_id] ?? [],
      chainId: token.chain_id,
    })),
  ];
  const slabCount = items.reduce((s, it) => s + it.slabs.length, 0);
  const popValue = token.player_fdv;

  return (
    <section id="vault" className="panel scroll-mt-24 p-5 sm:p-7" aria-labelledby="backing-title">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-xl">
          <h2 id="backing-title" className="font-display text-xl font-semibold tracking-tight">
            Proof of vault
          </h2>
          <p className="mt-1 text-sm text-slate">
            Every physical piece behind {ticker(token)}, with its grading certificate and the transaction that registered it
            on-chain. Tap a certificate to check it on the grader&apos;s own site.
          </p>
        </div>
        <div
          className={`flex max-w-sm items-start gap-2.5 rounded-2xl px-4 py-3 text-sm ${
            backing.fullyBacked ? "bg-up/8 text-graphite" : "bg-gold-wash text-gold-ink"
          }`}
        >
          {backing.fullyBacked ? (
            <CircleCheck className="mt-0.5 size-4 shrink-0 text-up" aria-hidden="true" />
          ) : (
            <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          )}
          <p>
            {backing.fullyBacked ? "Supply fully backed. " : "Supply and vault differ. "}
            <span className="tabular">
              {formatNumber(backing.actual)} {ticker(token)}
            </span>{" "}
            in circulation{backing.fullyBacked ? " equals " : " vs "}
            <span className="tabular">{formatNumber(backing.expected)}</span> minted for{" "}
            {view.vaulted.onchain} vaulted {view.vaulted.onchain === 1 ? "item" : "items"}.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-8">
        {items.map((it) => (
          <article key={it.key} className="space-y-4">
            <div className="flex gap-4">
              <div className="relative h-24 w-[72px] shrink-0 overflow-hidden rounded-xl bg-mist">
                <Image src={it.image} alt={it.name} fill sizes="72px" className="object-contain p-1" />
              </div>
              <div className="min-w-0 text-sm">
                <h3 className="font-medium leading-snug">{it.name}</h3>
                <dl className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate">
                  <div>
                    <dt className="inline">{it.category}: </dt>
                    <dd className="tabular inline text-graphite">
                      {it.count} {it.count === 1 ? "piece" : "pieces"}
                    </dd>
                  </div>
                  {it.pop > 0 && (
                    <div>
                      <dt className="inline">Graded population </dt>
                      <dd className="tabular inline text-graphite">{formatNumber(it.pop)}</dd>
                    </div>
                  )}
                  {it.perItem ? (
                    <div>
                      <dt className="inline">Redeem with </dt>
                      <dd className="tabular inline text-graphite">
                        {formatNumber(it.perItem)} {ticker(token)} ({formatUsd(it.perItem * price, { compact: true })})
                      </dd>
                    </div>
                  ) : (
                    <div className="text-gold-ink">Held off-chain, not minted into supply yet</div>
                  )}
                </dl>
              </div>
            </div>
            <SlabGrid items={it.slabs} itemName={it.name} chainId={it.chainId} />
          </article>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-2 border-t border-hairline pt-4 text-sm text-slate sm:flex-row sm:justify-between">
        <span>
          {slabCount} {slabCount === 1 ? "item" : "items"} listed individually by Grail.
        </span>
        {popValue > Number(token.market_cap) * 1.5 && (
          <span>
            If every graded copy in the population were vaulted at today&apos;s price:{" "}
            <span className="tabular font-medium text-graphite">{formatUsd(popValue, { compact: true })}</span>
          </span>
        )}
      </div>
    </section>
  );
}

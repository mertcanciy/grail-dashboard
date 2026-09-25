import Image from "next/image";
import type { TokenView } from "@/lib/token-view";
import { FALLBACK_IMAGE, ticker } from "@/lib/grail/meta";
import { formatNumber, formatUsd } from "@/lib/format";

export function BackingPanel({ view }: { view: TokenView }) {
  const { token } = view;
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
      onchain: true,
    })),
    ...token.offchain_collectibles.map((c) => ({
      key: `o-${c.collectible_id}`,
      name: c.name.trim(),
      image: c.image_url || FALLBACK_IMAGE,
      category: c.category,
      pop: c.psa_pop,
      perItem: null,
      count: c.available_items_count,
      onchain: false,
    })),
  ];
  const popValue = token.player_fdv;

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="backing-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 id="backing-title" className="font-display text-xl font-semibold tracking-tight">
            What&apos;s in the vault
          </h2>
          <p className="mt-1 max-w-xl text-sm text-slate">
            The physical pieces behind {ticker(token)}. Items marked as held off-chain sit in Grail&apos;s vault but
            aren&apos;t minted into supply yet.
          </p>
        </div>
        {popValue > Number(token.market_cap) * 1.5 && (
          <p className="max-w-xs text-sm text-slate sm:text-right">
            If every graded copy in the PSA population were vaulted at today&apos;s price, the set would be worth{" "}
            <span className="tabular font-medium text-graphite">{formatUsd(popValue, { compact: true })}</span>.
          </p>
        )}
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => (
          <li key={it.key} className="flex gap-4 rounded-2xl border border-hairline bg-mist/50 p-3">
            <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-xl bg-paper">
              <Image src={it.image} alt={it.name} fill sizes="96px" className="object-contain p-1.5" />
            </div>
            <div className="min-w-0 py-0.5 text-sm">
              <p className="line-clamp-3 font-medium leading-snug">{it.name}</p>
              <dl className="mt-2 space-y-0.5 text-xs text-slate">
                <div>
                  <dt className="inline">{it.category}, </dt>
                  <dd className="inline">
                    {it.count} {it.count === 1 ? "piece" : "pieces"}
                  </dd>
                </div>
                {it.pop > 0 && (
                  <div>
                    <dt className="inline">Graded population </dt>
                    <dd className="tabular inline">{formatNumber(it.pop)}</dd>
                  </div>
                )}
                {it.perItem ? (
                  <div>
                    <dt className="inline">Redeem with </dt>
                    <dd className="tabular inline">
                      {formatNumber(it.perItem)} {ticker(token)} ({formatUsd(it.perItem * price, { compact: true })})
                    </dd>
                  </div>
                ) : (
                  <div className="text-gold-ink">Held off-chain</div>
                )}
              </dl>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

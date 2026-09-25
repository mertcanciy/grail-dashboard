import Image from "next/image";
import Link from "next/link";
import type { TokenView } from "@/lib/token-view";
import { categoryOf, imageOf, itemImageOf, chainOf, grailTradeUrl, personName, poolVersion, quoteAssetOf, ticker } from "@/lib/grail/meta";
import { formatDate, formatNumber, formatPrice, formatUsd } from "@/lib/format";
import { Change } from "../change";
import { Reveal } from "../reveal";

export function TokenHeader({ view }: { view: TokenView }) {
  const { token } = view;
  const hero = itemImageOf(token);
  const chain = chainOf(token.chain_id);

  const stats = [
    { label: "Market cap", value: formatUsd(Number(token.market_cap), { compact: true }) },
    { label: "Volume, 24h", value: formatUsd(Number(token.volume_24h), { compact: true }), change: token.volume_change_24h_percent },
    { label: "Holders", value: view.holderCount != null ? formatNumber(view.holderCount) : "—" },
    { label: "Supply", value: formatNumber(token.total_supply, { compact: true }) },
    {
      label: "One full item",
      value: formatUsd(view.itemValue, { compact: true }),
      hint: `${formatNumber(view.perItem)} ${ticker(token)} redeem one item`,
    },
    {
      label: "In the vault",
      value: `${view.vaulted.total} ${view.vaulted.total === 1 ? "item" : "items"}`,
      hint: view.vaulted.offchain ? `${view.vaulted.offchain} held off-chain` : undefined,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 pt-8 sm:px-8 sm:pt-12">
      <nav aria-label="Breadcrumb" className="text-sm text-slate">
        <Link href="/tokens" className="hover:text-graphite">
          gTokens
        </Link>
        <span className="px-1.5" aria-hidden="true">/</span>
        <span className="text-graphite">{ticker(token)}</span>
      </nav>

      <div className="mt-6 grid gap-8 lg:grid-cols-[300px_1fr] lg:gap-12">
        <Reveal>
          <div className="slab-frame mx-auto w-full max-w-[300px] p-2.5">
            <div className="rounded-[16px] border border-hairline bg-paper px-3.5 py-3">
              <div className="flex items-baseline justify-between">
                <span className="font-display text-base font-semibold">{ticker(token)}</span>
                <span className="text-xs text-slate">{token.reserves[0]?.category ?? "Collectible"}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-slate" title={token.reserves[0]?.name}>
                {token.reserves[0]?.name ?? personName(token)}
              </div>
              <div className="gold-rule mt-2.5 h-[2px] rounded-full" />
            </div>
            <div className="relative mt-2.5 aspect-[4/5] overflow-hidden rounded-[16px] bg-[radial-gradient(120%_80%_at_50%_0%,#ffffff_0%,#eef0f4_60%,#e4e7ed_100%)]">
              <Image src={hero} alt={token.reserves[0]?.name ?? ticker(token)} fill priority sizes="300px" className="object-contain p-4 drop-shadow-[0_14px_18px_rgb(23_25_30/0.2)]" />
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="flex items-center gap-3">
            <span className="relative size-12 overflow-hidden rounded-2xl bg-muted">
              <Image src={imageOf(token)} alt="" fill sizes="48px" className="object-cover" />
            </span>
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">{ticker(token)}</h1>
            </div>
          </div>
          <p className="mt-2 text-lg text-slate">{personName(token)}</p>

          <ul className="mt-4 flex flex-wrap gap-1.5 text-xs font-medium" aria-label="Token details">
            <li className="rounded-full bg-gold-wash px-2.5 py-1 text-gold-ink">{categoryOf(token)}</li>
            <li className="rounded-full bg-paper px-2.5 py-1 shadow-[0_0_0_1px_var(--hairline)]">{chain.name}</li>
            <li className="rounded-full bg-paper px-2.5 py-1 shadow-[0_0_0_1px_var(--hairline)]">
              {poolVersion(token)}, {quoteAssetOf(token)} pair
            </li>
            <li className="rounded-full bg-paper px-2.5 py-1 shadow-[0_0_0_1px_var(--hairline)]">Listed {formatDate(token.created_at)}</li>
          </ul>

          <div className="mt-7 flex flex-wrap items-end gap-x-6 gap-y-3">
            <p className="tabular font-display text-5xl font-semibold tracking-tight">{formatPrice(token.market_price)}</p>
            <dl className="flex gap-5 pb-1.5 text-sm">
              {(
                [
                  ["1h", token.price_change_1h_percent],
                  ["24h", token.price_change_24h_percent],
                  ["7d", token.price_change_7d_percent],
                ] as const
              ).map(([k, v]) => (
                <div key={k} className="flex items-baseline gap-1.5">
                  <dt className="text-slate">{k}</dt>
                  <dd>
                    <Change value={v} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <dl className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-hairline bg-hairline sm:grid-cols-3">
            {stats.map((s) => (
              <div key={s.label} className="bg-paper px-4 py-3.5">
                <dt className="text-[13px] text-slate">{s.label}</dt>
                <dd className="mt-0.5 flex items-baseline gap-2">
                  <span className="tabular font-display text-xl font-semibold tracking-tight">{s.value}</span>
                  {s.change && <Change value={s.change} className="text-xs" />}
                </dd>
                {s.hint && <dd className="mt-0.5 text-xs text-slate">{s.hint}</dd>}
              </div>
            ))}
          </dl>

          <div className="mt-6 flex flex-wrap gap-2">
            <a
              href={grailTradeUrl(token)}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-graphite px-5 py-2.5 text-sm font-medium text-paper transition-colors hover:bg-black"
            >
              Trade {ticker(token)} on Grail
            </a>
            <a
              href={`https://grail.xyz/vault/${token.symbol.toLowerCase()}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-paper px-5 py-2.5 text-sm font-medium shadow-[0_0_0_1px_var(--hairline)] transition-colors hover:bg-mist"
            >
              See the vault page
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

import type { GrailToken } from "@/lib/grail/types";
import { CountUp, type CountFormat } from "./count-up";
import { Slab } from "./slab";
import { SlabMarquee } from "./slab-marquee";
import { Reveal } from "./reveal";

export interface HeroKpis {
  marketCap: number;
  volume24h: number;
  trades7d: number;
  avgBuy7d: number;
  traders7d: number;
  vaulted: number;
}

const KPI_ORDER: { key: keyof HeroKpis; label: string; format: CountFormat }[] = [
  { key: "marketCap", label: "Market cap, all gTokens", format: "usd-compact" },
  { key: "volume24h", label: "Volume, 24h", format: "usd-compact" },
  { key: "trades7d", label: "Trades, 7 days", format: "number" },
  { key: "avgBuy7d", label: "Average buy, 7 days", format: "usd" },
  { key: "traders7d", label: "Active wallets, 7 days", format: "number" },
  { key: "vaulted", label: "Items in the vault", format: "number" },
];

export function Hero({ kpis, tokens, updatedAt }: { kpis: HeroKpis; tokens: GrailToken[]; updatedAt: number }) {
  const featured = [...tokens].sort((a, b) => Number(b.market_cap) - Number(a.market_cap));
  const time = new Date(updatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" });

  return (
    <section className="relative overflow-hidden pb-4 pt-10 sm:pt-16">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Reveal>
          <p className="flex items-center gap-2 text-sm text-slate">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-up opacity-40" />
              <span className="relative inline-flex size-2 rounded-full bg-up" />
            </span>
            Live from Grail and the chain, refreshed {time} UTC
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-[clamp(2.4rem,6vw,4.6rem)] font-semibold leading-[0.98] tracking-[-0.035em] [font-variation-settings:'wdth'_92]">
            Every gToken, every trade, every card in the vault.
          </h1>
          <p className="mt-5 max-w-2xl text-[17px] leading-relaxed text-slate">
            Grail vaults PSA 10 cards and signed memorabilia, then issues one tradable token per legend. gYAMAL is backed by
            Lamine Yamal cards, gSWIFT by Taylor Swift items. This is the live view of that market.
          </p>
        </Reveal>

        <Reveal delay={0.15}>
          <dl className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-hairline bg-hairline shadow-[var(--shadow-soft)] sm:grid-cols-3 lg:grid-cols-6">
            {KPI_ORDER.map((k, i) => (
              <div key={k.key} className="bg-paper px-5 py-4">
                <dt className="text-[13px] text-slate">{k.label}</dt>
                <dd className="mt-1 font-display text-[26px] font-semibold tracking-tight">
                  <CountUp value={kpis[k.key]} format={k.format} delay={0.2 + i * 0.06} />
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <Reveal delay={0.3} className="mt-8">
        <SlabMarquee
          label="gToken slabs. Drag, or use the left and right arrow keys."
          slabs={featured.map((t, i) => ({ id: t.symbol, node: <Slab token={t} priority={i < 6} /> }))}
        />
      </Reveal>
    </section>
  );
}

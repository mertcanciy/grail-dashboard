import { loadOverview } from "@/lib/overview";
import { Hero } from "@/components/hero";
import { LensPanel } from "@/components/lens-panel";
import { BuyingBehavior } from "@/components/buying-behavior";
import { Heatmap } from "@/components/heatmap";
import { Movers } from "@/components/movers";
import { TradeTape } from "@/components/trade-tape";
import { HowItWorks } from "@/components/how-it-works";
import { SectionHeading } from "@/components/section-heading";

export const revalidate = 300;

export default async function OverviewPage() {
  const o = await loadOverview();

  return (
    <>
      <Hero kpis={o.kpis} tokens={o.tokens} updatedAt={o.now} />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 sm:px-8">
        <LensPanel data={o.lenses} />

        <BuyingBehavior
          summary={o.summary}
          histogram={o.histogram}
          avgBuyByToken={o.avgBuyByToken}
          largestBuyLabel={o.largestBuyLabel}
        />

        <Heatmap data={o.heatmap} />

        <section aria-label="Price movers" className="grid gap-5 md:grid-cols-3">
          <Movers title="Up the most, 24h" tokens={o.gainers} />
          <Movers title="Down the most, 24h" tokens={o.losers} />
          <Movers title="Most traded, 24h" tokens={o.mostTraded} />
        </section>

        <section className="panel p-5 sm:p-7" aria-labelledby="tape-title">
          <SectionHeading id="tape-title" title="Latest swaps">
            The most recent buys and sells across every gToken.
          </SectionHeading>
          <div className="mt-5">
            <TradeTape events={o.latest} tokens={o.tokens} now={o.now} />
          </div>
        </section>

        <div className="mt-10">
          <HowItWorks />
        </div>
      </div>
    </>
  );
}

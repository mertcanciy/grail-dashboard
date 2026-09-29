import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTokens } from "@/lib/grail/api";
import { personName, slugOf, ticker } from "@/lib/grail/meta";
import { formatPrice } from "@/lib/format";
import { loadToken } from "@/lib/token-view";
import { TokenHeader } from "@/components/token/token-header";
import { FlowPanel } from "@/components/token/flow-panel";
import { HoldersPanel } from "@/components/token/holders-panel";
import { BackingPanel } from "@/components/token/backing-panel";
import { ArbitragePanel } from "@/components/token/arbitrage-panel";
import { RedeemPanel } from "@/components/token/redeem-panel";
import { ContractsPanel } from "@/components/token/contracts-panel";
import { PriceChart } from "@/components/price-chart";
import { OnchainPanel } from "@/components/onchain-panel";
import { TradeTape } from "@/components/trade-tape";

export const revalidate = 300;

/** How many of the largest gTokens to prerender at build; each one costs dozens of Grail and RPC calls. */
const PRERENDER = 8;

/**
 * The largest gTokens are prerendered at build. The rest (and anything listed later) render on their first visit
 * and are then cached like the others (dynamicParams defaults to true). Keeping the build set small means one slow
 * Grail response is far less likely to fail a deploy; if Grail is unreachable, skip prerendering entirely.
 */
export async function generateStaticParams() {
  try {
    const { tokens } = await getTokens({ timeframe: "1d", windowDays: 1 });
    return [...tokens]
      .sort((a, b) => Number(b.market_cap) - Number(a.market_cap))
      .slice(0, PRERENDER)
      .map((t) => ({ symbol: slugOf(t) }));
  } catch {
    return [];
  }
}

export async function generateMetadata(props: PageProps<"/tokens/[symbol]">): Promise<Metadata> {
  const { symbol } = await props.params;
  const view = await loadToken(symbol);
  if (!view) return { title: "gToken not found" };
  const t = view.token;
  return {
    title: `${ticker(t)} ${formatPrice(t.market_price)}`,
    description: `${ticker(t)} is backed by ${personName(t)} collectibles in Grail's vault. Price, trading flow, holders and contracts.`,
  };
}

export default async function TokenPage(props: PageProps<"/tokens/[symbol]">) {
  const { symbol } = await props.params;
  const view = await loadToken(symbol);
  if (!view) notFound();
  const { token } = view;

  return (
    <>
      <TokenHeader view={view} maxAgeSec={revalidate} />
      <div className="mx-auto mt-10 flex max-w-7xl flex-col gap-6 px-5 sm:px-8">
        <PriceChart symbol={slugOf(token)} initial={view.candles7d} livePrice={token.market_price} renderedAt={view.now} />

        <div className="grid gap-6 lg:grid-cols-2">
          <FlowPanel view={view} />
          <HoldersPanel view={view} />
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[1.5fr_1fr]">
          <ArbitragePanel view={view} />
          <RedeemPanel view={view} />
        </div>

        <BackingPanel view={view} />

        <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
          <ContractsPanel token={token} />
          <OnchainPanel
            token={{
              chain_id: token.chain_id,
              token_address: token.token_address,
              pool_address: token.pool_address,
              v4_pool: token.v4_pool,
              symbol: token.symbol,
              name: token.name,
              market_price: token.market_price,
              peg_ticker: token.peg_ticker,
            }}
            pegUsd={view.quote?.quoteUsdSource === "robinhood" ? view.quote.quoteUsd : null}
          />
        </div>

        <section className="panel p-5 sm:p-7" aria-labelledby="activity-title">
          <h2 id="activity-title" className="font-display text-xl font-semibold tracking-tight">
            Recent activity
          </h2>
          <p className="mt-1 text-sm text-slate">
            Swaps, liquidity moves and pack claims, newest first.
            {view.allTimeEvents != null && ` ${view.allTimeEvents.toLocaleString("en-US")} events since launch.`}
            {view.activityStatus === "failed" && " Grail's activity feed didn't respond; showing no events rather than guessing."}
          </p>
          <div className="mt-4">
            <TradeTape events={view.recent} chainId={token.chain_id} now={view.now} showToken={false} />
          </div>
        </section>
      </div>
    </>
  );
}

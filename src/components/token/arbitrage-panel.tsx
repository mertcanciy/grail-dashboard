import { ExternalLink } from "lucide-react";
import type { TokenView } from "@/lib/token-view";
import { impact } from "@/lib/quotes";
import { primaryReserve, ticker } from "@/lib/grail/meta";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

function Pct({ value, invert }: { value: number | null; invert?: boolean }) {
  if (value == null) return <span className="text-slate">—</span>;
  const bad = invert ? value < -0.02 : value > 0.02;
  return (
    <span className={cn("tabular", bad ? "text-down" : "text-slate")}>
      {value >= 0 ? "+" : "−"}
      {formatShare(Math.abs(value))}
    </span>
  );
}

/** Query used for eBay searches: the vaulted card's own title is the most precise description we have. */
function searchQuery(name: string) {
  return name.replace(/\s+/g, " ").trim();
}

export function ArbitragePanel({ view }: { view: TokenView }) {
  const { token, quote, perItem } = view;
  const t = ticker(token);
  const full = quote?.depth.find((d) => d.fraction === 1);
  const buyPremium = full ? impact(full.buyUsd, quote!.spotUsd) : null;
  const sellDiscount = full ? impact(full.sellUsd, quote!.spotUsd) : null;
  const item = primaryReserve(token);
  const itemName = item?.name ?? token.name;
  const q = encodeURIComponent(searchQuery(itemName));
  const isCard = /psa|card/i.test(`${itemName} ${item?.category ?? ""}`);
  const piece = isCard ? "card" : "item";

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="arb-title">
      <h2 id="arb-title" className="font-display text-xl font-semibold tracking-tight">
        What one item really costs
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate">
        Redeeming takes {formatNumber(perItem)} {t}. Grail&apos;s price says that&apos;s worth{" "}
        <span className="tabular font-medium text-graphite">{formatUsd(quote?.spotUsd ?? view.itemValue, { compact: true })}</span>, but
        a real trade moves the price. These quotes come straight from the Uniswap pool, fees and price impact included.
      </p>

      {!quote ? (
        <p className="mt-6 rounded-xl bg-mist px-4 py-3 text-sm text-slate">
          The pool quote didn&apos;t load this time. It refreshes every few minutes.
        </p>
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-hairline p-4">
              <p className="text-sm text-slate">Buy a full item&apos;s worth</p>
              {full?.buyUsd != null ? (
                <>
                  <p className="tabular mt-1 font-display text-2xl font-semibold">{formatUsd(full.buyUsd, { compact: true })}</p>
                  <p className="mt-0.5 text-xs">
                    <Pct value={buyPremium} /> <span className="text-slate">vs Grail&apos;s price</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm">
                  <span className="font-medium">The pool can&apos;t supply a full item right now.</span>{" "}
                  <span className="text-slate">
                    {quote.maxBuyFraction > 0
                      ? `The largest size it can fill is about ${formatShare(quote.maxBuyFraction)} of one.`
                      : "Even 1% of one is more than it can fill."}
                  </span>
                </p>
              )}
            </div>
            <div className="rounded-2xl border border-hairline p-4">
              <p className="text-sm text-slate">Sell a full item&apos;s worth</p>
              {full?.sellUsd != null ? (
                <>
                  <p className="tabular mt-1 font-display text-2xl font-semibold">{formatUsd(full.sellUsd, { compact: true })}</p>
                  <p className="mt-0.5 text-xs">
                    <Pct value={sellDiscount} invert /> <span className="text-slate">vs Grail&apos;s price</span>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm">
                  <span className="font-medium">The pool can&apos;t absorb a full item.</span>{" "}
                  <span className="text-slate">
                    {quote.sellCapUsd != null
                      ? `It runs out of ${quote.quoteSymbol} at about ${formatUsd(quote.sellCapUsd, { compact: true })}.`
                      : "Selling that much would exhaust its liquidity."}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="mt-6">
            <table className="w-full text-sm">
              <caption className="mb-2 text-left text-sm font-medium text-graphite">Market depth</caption>
              <thead>
                <tr className="border-b border-hairline text-left text-xs text-slate">
                  <th className="py-2 font-medium">Size</th>
                  <th className="py-2 text-right font-medium">Buy cost</th>
                  <th className="py-2 text-right font-medium">Sell proceeds</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-hairline">
                {quote.depth.map((d) => {
                  const spot = quote.spotUsd * d.fraction;
                  return (
                    <tr key={d.fraction}>
                      <td className="py-2">
                        <span className="block">{d.fraction === 1 ? "1 item" : `${formatShare(d.fraction)} of an item`}</span>
                        <span className="tabular block text-xs text-slate">
                          {formatNumber(d.tokens, { compact: true })} {t}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <span className="tabular block">{d.buyUsd != null ? formatUsd(d.buyUsd, { compact: true }) : "Can't fill"}</span>
                        {d.buyUsd != null && (
                          <span className="block text-xs">
                            <Pct value={impact(d.buyUsd, spot)} />
                          </span>
                        )}
                      </td>
                      <td className="py-2 text-right">
                        <span className="tabular block">{d.sellUsd != null ? formatUsd(d.sellUsd, { compact: true }) : "Can't fill"}</span>
                        {d.sellUsd != null && (
                          <span className="block text-xs">
                            <Pct value={impact(d.sellUsd, spot)} invert />
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {quote.quoteSymbol && !/USD/i.test(quote.quoteSymbol) && (
              <p className="mt-2 text-xs text-slate">
                This pool trades against {quote.quoteSymbol};{" "}
                {quote.quoteUsdSource === "robinhood"
                  ? `dollar figures use Robinhood's live ${quote.quoteSymbol} quote of ${formatUsd(quote.quoteUsd)}.`
                  : `Robinhood's ${quote.quoteSymbol} quote was unavailable, so dollar figures use the rate implied by Grail's price.`}
              </p>
            )}
          </div>
        </>
      )}

      <div className="mt-6 rounded-2xl bg-mist/70 p-4">
        <p className="text-sm font-medium">Compare with the physical market</p>
        <p className="mt-1 text-sm text-slate">
          The same {piece} also trades outside Grail. When its market price and the token price drift apart, there are two ways to
          close the gap:
        </p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-paper p-3.5">
            <dt className="font-medium">Tokens into the {piece}</dt>
            <dd className="mt-1 text-slate">
              {full?.buyUsd != null ? (
                <>
                  Buy {formatNumber(perItem)} {t} for{" "}
                  <span className="tabular font-medium text-graphite">{formatUsd(full.buyUsd, { compact: true })}</span>, redeem them
                  and sell the {piece}. Worth it when the {piece} sells for more than that.
                </>
              ) : (
                <>
                  Buy {formatNumber(perItem)} {t}, redeem them and sell the {piece}. Not possible from the pool alone right now: it
                  can&apos;t supply that many tokens.
                </>
              )}
            </dd>
          </div>
          <div className="rounded-xl bg-paper p-3.5">
            <dt className="font-medium">The {piece} into tokens</dt>
            <dd className="mt-1 text-slate">
              {full?.sellUsd != null ? (
                <>
                  Buy the {piece}, submit it to Grail&apos;s vault and sell the {formatNumber(perItem)} {t} it becomes for{" "}
                  <span className="tabular font-medium text-graphite">{formatUsd(full.sellUsd, { compact: true })}</span>. Worth it when
                  the {piece} costs less than that.
                </>
              ) : (
                <>
                  Buy the {piece}, submit it to Grail&apos;s vault and sell the {formatNumber(perItem)} {t} it becomes. The pool
                  can&apos;t absorb that many right now
                  {quote?.sellCapUsd != null ? `; it runs out at about ${formatUsd(quote.sellCapUsd, { compact: true })}` : ""}.
                </>
              )}
            </dd>
          </div>
        </dl>
        {full?.sellUsd != null && (
          <p className="mt-3 text-sm text-slate">
            Already hold {formatNumber(perItem)} {t}? Redeeming beats selling them when the {piece} is worth more than{" "}
            <span className="tabular font-medium text-graphite">{formatUsd(full.sellUsd, { compact: true })}</span>.
          </p>
        )}
        <p className="mt-3 text-xs leading-relaxed text-slate">
          Not included: marketplace fees (eBay takes around 13%), shipping, and waiting time. Redemptions ship in about five business
          days, Grail checks eligibility before accepting an item into the vault, and prices can move in the meantime.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a
            href={`https://www.ebay.com/sch/i.html?_nkw=${q}&_sop=15`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 font-medium shadow-[0_0_0_1px_var(--hairline)] hover:bg-muted"
          >
            Current listings on eBay <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          <a
            href={`https://www.ebay.com/sch/i.html?_nkw=${q}&LH_Sold=1&LH_Complete=1&_sop=13`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 font-medium shadow-[0_0_0_1px_var(--hairline)] hover:bg-muted"
          >
            Recent eBay sales <ExternalLink className="size-3.5" aria-hidden="true" />
          </a>
          {isCard && (
            <a
              href="#vault"
              className="inline-flex items-center gap-1.5 rounded-full bg-paper px-3.5 py-1.5 font-medium shadow-[0_0_0_1px_var(--hairline)] hover:bg-muted"
            >
              PSA sales on each cert page
            </a>
          )}
        </div>
        <p className="mt-2 text-xs text-slate">eBay shows sold listings only when you&apos;re signed in.</p>
      </div>
    </section>
  );
}

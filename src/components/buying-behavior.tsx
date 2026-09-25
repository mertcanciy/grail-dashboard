import Link from "next/link";
import type { BreakdownRow, TradeSummary, buySizeHistogram } from "@/lib/metrics";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";
import { SectionHeading } from "./section-heading";

export function BuyingBehavior({
  summary,
  histogram,
  avgBuyByToken,
  largestBuyLabel,
}: {
  summary: TradeSummary;
  histogram: ReturnType<typeof buySizeHistogram>;
  avgBuyByToken: BreakdownRow[];
  largestBuyLabel: string | null;
}) {
  const maxShare = Math.max(...histogram.map((h) => h.share), 0.0001);
  const maxAvg = Math.max(...avgBuyByToken.map((r) => r.avg), 1);
  const typical = histogram.reduce((best, h) => (h.share > best.share ? h : best), histogram[0]);

  return (
    <section aria-labelledby="buying-title" className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
      <div className="panel p-5 sm:p-7">
        <SectionHeading id="buying-title" title="How people buy">
          Every gToken buy over the last seven days, measured in dollars at the moment of the swap.
        </SectionHeading>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-5 sm:grid-cols-4">
          <Stat label="Average buy" value={formatUsd(summary.avgBuy)} />
          <Stat label="Median buy" value={formatUsd(summary.medianBuy)} />
          <Stat label="Average sell" value={formatUsd(summary.avgSell)} />
          <Stat label="Buy side of volume" value={formatShare(summary.buyShare)} />
        </dl>

        <div className="mt-8">
          <p className="text-sm text-slate">
            Most buys land in the <span className="font-medium text-graphite">{typical.label}</span> range.
          </p>
          <div className="mt-4 flex h-40 items-end gap-2 sm:gap-3" role="img" aria-label="Distribution of buy sizes">
            {histogram.map((h) => (
              <div key={h.label} className="flex h-full flex-1 flex-col justify-end">
                <span className="tabular mb-1.5 text-center text-xs font-medium">{formatShare(h.share)}</span>
                <div
                  className={h === typical ? "rounded-t-lg bg-gold" : "rounded-t-lg bg-graphite/10"}
                  style={{ height: `${Math.max(3, (h.share / maxShare) * 100)}%` }}
                  title={`${formatNumber(h.count)} buys, ${formatUsd(h.volume)}`}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex gap-2 sm:gap-3">
            {histogram.map((h) => (
              <span key={h.label} className="flex-1 text-center text-[11px] leading-tight text-slate">
                {h.label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t border-hairline pt-5 text-sm sm:grid-cols-3">
          <p>
            <span className="block text-slate">Buyers</span>
            <span className="tabular font-semibold">{formatNumber(summary.uniqueBuyers)} wallets</span>
          </p>
          <p>
            <span className="block text-slate">Net flow</span>
            <span className={`tabular font-semibold ${summary.netFlow >= 0 ? "text-up" : "text-down"}`}>
              {summary.netFlow >= 0 ? "+" : ""}
              {formatUsd(summary.netFlow, { compact: true })}
            </span>
          </p>
          <p>
            <span className="block text-slate">Largest buy</span>
            <span className="tabular font-semibold">{largestBuyLabel ?? "—"}</span>
          </p>
        </div>
      </div>

      <div className="panel p-5 sm:p-7">
        <SectionHeading title="Average buy by gToken">
          Where buyers put the most money in per swap. gTokens with fewer than five buys this week are left out.
        </SectionHeading>
        <ol className="mt-6 space-y-3.5">
          {avgBuyByToken.map((r) => (
            <li key={r.key}>
              <Link href={r.href ?? "#"} className="group block rounded-lg">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium group-hover:text-gold-ink">
                    {r.label} <span className="font-normal text-slate">{r.sublabel}</span>
                  </span>
                  <span className="tabular font-semibold">{formatUsd(r.avg)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-muted">
                    <div className="h-full rounded-full bg-graphite/75" style={{ width: `${(r.avg / maxAvg) * 100}%` }} />
                  </div>
                  <span className="tabular w-16 text-right text-xs text-slate">{formatNumber(r.count)} buys</span>
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate">{label}</dt>
      <dd className="tabular mt-1 font-display text-2xl font-semibold tracking-tight">{value}</dd>
    </div>
  );
}

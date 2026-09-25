import type { TokenView } from "@/lib/token-view";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";

export function FlowPanel({ view }: { view: TokenView }) {
  const { summary: s, flow } = view;
  const maxDay = Math.max(...flow.map((d) => Math.max(d.buy, d.sell)), 1);

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="flow-title">
      <h2 id="flow-title" className="font-display text-xl font-semibold tracking-tight">
        Buying and selling, 7 days
      </h2>
      <p className="mt-1 text-sm text-slate">
        {s.trades
          ? `${formatNumber(s.trades)} swaps from ${formatNumber(s.uniqueTraders)} wallets. Buyers made up ${formatShare(s.buyShare)} of the volume.`
          : "Nobody has swapped this gToken in the last seven days."}
      </p>

      {s.volume > 0 && (
        <div className="mt-5">
          <div className="flex h-3 overflow-hidden rounded-full bg-muted" role="img" aria-label={`Buy ${formatShare(s.buyShare)}, sell ${formatShare(1 - s.buyShare)}`}>
            <div className="h-full bg-up" style={{ width: `${s.buyShare * 100}%` }} />
            <div className="h-full flex-1 bg-down/80" />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span>
              <span className="text-slate">Bought </span>
              <span className="tabular font-semibold text-up">{formatUsd(s.buyVolume, { compact: true })}</span>
            </span>
            <span>
              <span className="text-slate">Sold </span>
              <span className="tabular font-semibold text-down">{formatUsd(s.sellVolume, { compact: true })}</span>
            </span>
          </div>
        </div>
      )}

      <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-4">
        <Item label="Average buy" value={formatUsd(s.avgBuy)} />
        <Item label="Median buy" value={formatUsd(s.medianBuy)} />
        <Item label="Largest buy" value={s.largestBuy ? formatUsd(Number(s.largestBuy.usd_value)) : "—"} />
        <Item
          label="Net flow"
          value={`${s.netFlow >= 0 ? "+" : ""}${formatUsd(s.netFlow, { compact: true })}`}
          tone={s.netFlow >= 0 ? "text-up" : "text-down"}
        />
      </dl>

      <div className="mt-7">
        <div className="flex h-28 items-end gap-2" role="img" aria-label="Daily buy and sell volume">
          {flow.map((d) => (
            <div key={d.day} className="flex h-full flex-1 items-end justify-center gap-0.5" title={`${new Date(d.day).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}: bought ${formatUsd(d.buy)}, sold ${formatUsd(d.sell)}`}>
              <div className="w-1/2 max-w-3 rounded-t bg-up" style={{ height: `${Math.max(d.buy ? 3 : 0, (d.buy / maxDay) * 100)}%` }} />
              <div className="w-1/2 max-w-3 rounded-t bg-down/80" style={{ height: `${Math.max(d.sell ? 3 : 0, (d.sell / maxDay) * 100)}%` }} />
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2 border-t border-hairline pt-2">
          {flow.map((d) => (
            <span key={d.day} className="flex-1 text-center text-[11px] text-slate">
              {new Date(d.day).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Item({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-slate">{label}</dt>
      <dd className={`tabular mt-0.5 font-display text-lg font-semibold ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}

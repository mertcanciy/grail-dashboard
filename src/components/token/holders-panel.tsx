import type { TokenView } from "@/lib/token-view";
import { explorerAddress, ticker } from "@/lib/grail/meta";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";

export function HoldersPanel({ view }: { view: TokenView }) {
  const { holders, holderCount, concentration, token } = view;
  const top = holders.slice(0, 8);
  const max = Math.max(...top.map((h) => Number(h.percentage)), 0.01);

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="holders-title">
      <h2 id="holders-title" className="font-display text-xl font-semibold tracking-tight">
        Who holds it
      </h2>
      <p className="mt-1 text-sm text-slate">
        {holderCount != null ? `${formatNumber(holderCount)} wallets hold ${ticker(token)}. ` : ""}
        The ten largest control {formatShare(concentration.top10)} of the supply.
      </p>

      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline text-sm">
        {(
          [
            ["Largest wallet", concentration.top1],
            ["Top 10", concentration.top10],
            ["Top 50", concentration.top50],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="bg-paper px-3 py-2.5">
            <div className="text-xs text-slate">{label}</div>
            <div className="tabular font-display text-lg font-semibold">{formatShare(v)}</div>
          </div>
        ))}
      </div>

      <ol className="mt-5 space-y-3">
        {top.map((h, i) => {
          const url = explorerAddress(token.chain_id, h.address);
          return (
            <li key={h.address} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
              <span className="tabular text-slate">{i + 1}</span>
              <div className="min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  {url ? (
                    <a href={url} target="_blank" rel="noreferrer" className="truncate font-medium hover:text-gold-ink">
                      {h.username ?? h.display_name}
                    </a>
                  ) : (
                    <span className="truncate font-medium">{h.username ?? h.display_name}</span>
                  )}
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-graphite/75" style={{ width: `${(Number(h.percentage) / max) * 100}%` }} />
                </div>
              </div>
              <div className="w-24 text-right">
                <div className="tabular font-semibold">{Number(h.percentage).toFixed(2)}%</div>
                <div className="tabular text-xs text-slate">{formatUsd(Number(h.usd_value))}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

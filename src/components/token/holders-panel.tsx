import type { TokenView } from "@/lib/token-view";
import Link from "next/link";
import { ticker } from "@/lib/grail/meta";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";

export function HoldersPanel({ view }: { view: TokenView }) {
  const { collectors, holderCount, concentration, grailShare, token } = view;
  const float = Math.max(1 - grailShare, 0);
  const floatUsd = Number(token.market_cap) * float;
  const top = collectors.slice(0, 8);
  const max = Math.max(...top.map((h) => Number(h.percentage)), 0.01);
  const ofFloat = (h: (typeof top)[number]) => (float > 0 ? Number(h.percentage) / 100 / float : 0);

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="holders-title">
      <h2 id="holders-title" className="font-display text-xl font-semibold tracking-tight">
        Who holds it
      </h2>
      <p className="mt-1 text-sm text-slate">
        {holderCount != null ? `${formatNumber(holderCount)} wallets hold ${ticker(token)}. ` : ""}
        {grailShare > 0
          ? `Grail's own inventory holds ${formatShare(grailShare)} of the supply; the other ${formatShare(float)}${
              floatUsd > 0 ? `, about ${formatUsd(floatUsd, { compact: true })},` : ""
            } is with collectors. The ten largest collectors hold ${formatShare(concentration.top10)} of that float.`
          : `The ten largest collectors hold ${formatShare(concentration.top10)} of the supply.`}
      </p>

      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-hairline bg-hairline text-sm">
        {(
          [
            ["Largest collector", concentration.top1],
            ["Top 10", concentration.top10],
            ["Top 50", concentration.top50],
          ] as const
        ).map(([label, v]) => (
          <div key={label} className="bg-paper px-3 py-2.5">
            <div className="text-xs text-slate">
              {label}
              {grailShare > 0 && <span className="sr-only"> of collector float</span>}
            </div>
            <div className="tabular font-display text-lg font-semibold">{formatShare(v)}</div>
          </div>
        ))}
      </div>
      {grailShare > 0 && <p className="mt-2 text-xs text-slate">Shares of the collector float, excluding Grail&apos;s inventory.</p>}

      <ol className="mt-5 space-y-3">
        {top.map((h, i) => (
          <li key={h.address} className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 text-sm">
            <span className="tabular text-slate">{i + 1}</span>
            <div className="min-w-0">
              <Link href={`/address/${h.address.toLowerCase()}`} className="block truncate font-medium hover:text-gold-ink">
                {h.username ?? h.display_name}
              </Link>
              <div className="mt-1 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-graphite/75" style={{ width: `${(Number(h.percentage) / max) * 100}%` }} />
              </div>
            </div>
            <div className="w-24 text-right">
              <div className="tabular font-semibold">{formatShare(grailShare > 0 ? ofFloat(h) : Number(h.percentage) / 100)}</div>
              <div className="tabular text-xs text-slate">{formatUsd(Number(h.usd_value))}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

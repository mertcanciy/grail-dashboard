import Link from "next/link";
import type { TokenView } from "@/lib/token-view";
import { ticker } from "@/lib/grail/meta";
import { shortAddress } from "@/lib/metrics";
import { formatNumber, formatShare, formatUsd } from "@/lib/format";

export function RedeemPanel({ view }: { view: TokenView }) {
  const { token, redeemable, nearRedeem, perItem } = view;
  const t = ticker(token);
  const total = redeemable.reduce((s, c) => s + c.items, 0);

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="redeem-title">
      <h2 id="redeem-title" className="font-display text-xl font-semibold tracking-tight">
        Who could redeem today
      </h2>
      <p className="mt-1 text-sm text-slate">
        {redeemable.length
          ? `${redeemable.length} ${redeemable.length === 1 ? "collector holds" : "collectors hold"} enough ${t} to claim ${total} of the ${view.vaulted.onchain} vaulted ${view.vaulted.onchain === 1 ? "item" : "items"} on their own.`
          : `No collector holds the ${formatNumber(perItem)} ${t} needed to redeem an item yet.`}
        {view.grailRedeemable > 0 && ` Grail's admin wallet holds enough for ${view.grailRedeemable} more; it isn't counted.`}
      </p>

      {redeemable.length > 0 && (
        <ul className="mt-4 divide-y divide-hairline">
          {redeemable.slice(0, 6).map((c) => (
            <li key={c.address} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <Link href={`/address/${c.address}`} className="min-w-0 hover:text-gold-ink">
                <span className="block truncate font-medium">{c.name}</span>
                <span className="block text-xs text-slate">{shortAddress(c.address)}</span>
              </Link>
              <span className="text-right">
                <span className="tabular block font-semibold">
                  {c.items} {c.items === 1 ? "item" : "items"}
                </span>
                <span className="tabular block text-xs text-slate">{formatUsd(c.usd, { compact: true })}</span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {nearRedeem.length > 0 && (
        <div className="mt-5">
          <p className="text-sm font-medium">Getting close</p>
          <ul className="mt-2 space-y-2.5">
            {nearRedeem.slice(0, 4).map((c) => (
              <li key={c.address} className="text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <Link href={`/address/${c.address}`} className="truncate hover:text-gold-ink">
                    {c.name}
                  </Link>
                  <span className="tabular text-xs text-slate">{formatShare(c.progress)} of an item</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, c.progress * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

import Image from "next/image";
import Link from "next/link";
import type { GrailToken } from "@/lib/grail/types";
import { personName, slugOf, ticker } from "@/lib/grail/meta";
import { formatPrice } from "@/lib/format";
import { Change } from "./change";
import { Sparkline } from "./sparkline";

export function Movers({ title, tokens }: { title: string; tokens: GrailToken[] }) {
  return (
    <div className="panel p-5 sm:p-6">
      <h3 className="font-display text-lg font-semibold tracking-tight">{title}</h3>
      <ul className="mt-3 divide-y divide-hairline">
        {tokens.map((t) => (
          <li key={t.symbol}>
            <Link href={`/tokens/${slugOf(t)}`} className="group flex items-center gap-3 py-2.5">
              <span className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-muted">
                <Image src={t.image_url} alt="" fill sizes="36px" className="object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium group-hover:text-gold-ink">{ticker(t)}</span>
                <span className="block truncate text-xs text-slate">{personName(t)}</span>
              </span>
              <Sparkline candles={t.ohlcv_list} width={84} height={28} className="hidden shrink-0 sm:block" />
              <span className="w-20 text-right">
                <span className="tabular block text-sm font-semibold">{formatPrice(t.market_price)}</span>
                <Change value={t.price_change_24h_percent} className="text-xs" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

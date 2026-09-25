import Image from "next/image";
import Link from "next/link";
import type { GrailToken } from "@/lib/grail/types";
import { personName, slugOf, ticker, tokensPerItem, vaultedItems } from "@/lib/grail/meta";
import { formatNumber, formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Change } from "./change";

/**
 * A gToken rendered like a graded-card slab: a label strip on top, the vaulted item in an acrylic well below.
 */
export function Slab({ token, className, priority }: { token: GrailToken; className?: string; priority?: boolean }) {
  const image = token.reserves[0]?.image_url ?? token.image_url;
  const vaulted = vaultedItems(token).total;
  return (
    <Link
      href={`/tokens/${slugOf(token)}`}
      draggable={false}
      className={cn("slab-frame group block w-[212px] select-none p-2 transition-transform duration-300 hover:-translate-y-1", className)}
    >
      <div className="rounded-[15px] border border-hairline bg-paper px-3 pb-2 pt-2.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-[15px] font-semibold tracking-tight">{ticker(token)}</span>
          <span className="tabular text-[13px] font-semibold">{formatPrice(token.market_price)}</span>
        </div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11.5px]">
          <span className="truncate text-slate">{personName(token)}</span>
          <Change value={token.price_change_24h_percent} className="text-[11.5px]" />
        </div>
        <div className="gold-rule mt-2 h-[2px] rounded-full" />
      </div>
      <div className="relative mt-2 aspect-[4/5] overflow-hidden rounded-[15px] bg-[radial-gradient(120%_80%_at_50%_0%,#ffffff_0%,#eef0f4_60%,#e4e7ed_100%)]">
        <Image
          src={image}
          alt={token.reserves[0]?.name ?? ticker(token)}
          fill
          sizes="212px"
          priority={priority}
          draggable={false}
          className="object-contain p-3 drop-shadow-[0_10px_14px_rgb(23_25_30/0.18)] transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 rounded-[15px] bg-[linear-gradient(115deg,transparent_35%,rgb(255_255_255/0.55)_48%,transparent_60%)] opacity-60" />
      </div>
      <div className="flex items-center justify-between px-1.5 pb-0.5 pt-2 text-[11px] text-slate">
        <span className="tabular">{formatNumber(tokensPerItem(token), { compact: true })} = 1 item</span>
        <span className="tabular">{vaulted} in vault</span>
      </div>
    </Link>
  );
}

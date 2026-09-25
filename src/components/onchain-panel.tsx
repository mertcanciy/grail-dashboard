"use client";

import { useEffect, useState } from "react";
import type { GrailToken } from "@/lib/grail/types";
import { readOnchain, type OnchainSnapshot, type OnchainTarget } from "@/lib/onchain";
import { chainOf, quoteAssetOf, ticker } from "@/lib/grail/meta";
import { formatNumber, formatPrice, formatTokenAmount, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const POLL_MS = 20_000;

export type OnchainPanelToken = OnchainTarget & Pick<GrailToken, "symbol" | "name" | "market_price" | "peg_ticker">;

export function OnchainPanel({ token }: { token: OnchainPanelToken }) {
  const [snap, setSnap] = useState<OnchainSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [pulse, setPulse] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      readOnchain(token)
        .then((s) => {
          if (cancelled) return;
          setSnap(s);
          setError(false);
          setPulse((p) => p + 1);
        })
        .catch(() => !cancelled && setError(true));
    load();
    const id = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [token]);

  const chain = chainOf(token.chain_id);
  const quote = quoteAssetOf(token);
  const apiPrice = token.market_price ?? 0;
  const pool = snap?.pool;
  const isUsd = pool?.quoteSymbol.toUpperCase().includes("USD");
  const drift = pool && isUsd && apiPrice ? ((pool.priceInQuote - apiPrice) / apiPrice) * 100 : null;
  const impliedQuoteUsd = pool && !isUsd && pool.priceInQuote > 0 ? apiPrice / pool.priceInQuote : null;

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="onchain-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="onchain-title" className="font-display text-xl font-semibold tracking-tight">
            Straight from the chain
          </h2>
          <p className="mt-1 text-sm text-slate">
            Read live from {chain.name} in your browser, independent of Grail&apos;s API. Refreshes every 20 seconds.
          </p>
        </div>
        <span
          className={cn(
            "tabular inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            error ? "bg-down/10 text-down" : "bg-mist text-slate",
          )}
        >
          <span key={pulse} className={cn("size-1.5 rounded-full", error ? "bg-down" : "bg-up animate-in zoom-in-50 duration-500")} />
          {error ? "RPC unreachable" : snap ? `Block ${formatNumber(Number(snap.blockNumber))}` : "Connecting"}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <Item label="Total supply" value={snap ? `${formatTokenAmount(snap.totalSupply)} ${ticker(token)}` : null} />
        <Item
          label={`Pool price in ${pool?.quoteSymbol ?? quote}`}
          value={pool ? (isUsd ? formatPrice(pool.priceInQuote) : `${Number(pool.priceInQuote.toPrecision(4))} ${pool.quoteSymbol}`) : null}
        />
        <Item label="Pool" value={pool ? `Uniswap ${pool.version}, ${pool.feeBps / 100}% fee` : null} />
        <Item label="Current tick" value={pool ? formatNumber(pool.tick) : null} />
        {pool?.reserves && (
          <>
            <Item label={`${ticker(token)} in pool`} value={formatTokenAmount(pool.reserves.token)} />
            <Item label={`${pool.quoteSymbol} in pool`} value={formatTokenAmount(pool.reserves.quote)} />
          </>
        )}
      </dl>

      {(drift != null || impliedQuoteUsd != null) && (
        <p className="mt-5 rounded-xl bg-gold-wash px-3.5 py-2.5 text-sm text-gold-ink">
          {drift != null
            ? Math.abs(drift) < 1
              ? `The pool price matches Grail's quoted ${formatPrice(apiPrice)} to within 1%.`
              : `The pool price is ${Math.abs(drift).toFixed(1)}% ${drift > 0 ? "above" : "below"} Grail's quoted ${formatPrice(apiPrice)}.`
            : `This pool is paired with ${pool!.quoteSymbol}, so Grail's ${formatPrice(apiPrice)} price implies 1 ${pool!.quoteSymbol} ≈ ${formatUsd(impliedQuoteUsd!)}.`}
        </p>
      )}
    </section>
  );
}

function Item({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-slate">{label}</dt>
      <dd className="tabular mt-0.5 font-medium">{value ?? <span className="inline-block h-4 w-20 animate-pulse rounded bg-muted" />}</dd>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { ChainActivity as ChainActivityData } from "@/lib/wallet";
import { WALLET_FEED_DAYS } from "@/lib/activity-rows";
import { ActivityList } from "./activity-list";

/**
 * On-chain activity for wallets whose Grail activity isn't readable, fetched after the page renders so the walk
 * over every token feed never holds the page back. Refetches on each server refresh and keeps the last rows meanwhile.
 */
export function ChainActivity({
  address,
  name,
  isPrivate,
  renderedAt,
}: {
  address: string;
  name: string;
  isPrivate: boolean;
  renderedAt: number;
}) {
  const [state, setState] = useState<{ data: ChainActivityData | null; failed: boolean }>({ data: null, failed: false });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/address/${address}/activity`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data: ChainActivityData) => !cancelled && setState({ data, failed: false }))
      .catch(() => !cancelled && setState((s) => ({ data: s.data, failed: !s.data })));
    return () => {
      cancelled = true;
    };
  }, [address, renderedAt]);

  const { data, failed } = state;
  const days = data?.days ?? WALLET_FEED_DAYS;

  return (
    <>
      <p className="mt-1 text-xs text-slate">
        {isPrivate ? `${name} keeps their Grail activity private, so this` : "This"} is the wallet&apos;s on-chain gToken
        activity from the last {days} days, read from Grail&apos;s public token feeds.
        {data?.status === "incomplete" && " Some token feeds didn't load fully, so older trades may be missing."}
      </p>
      {!data && !failed ? (
        <ul className="mt-3 space-y-3" aria-busy="true">
          <li className="sr-only">Loading on-chain activity…</li>
          {Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="h-6 animate-pulse rounded-lg bg-muted" />
          ))}
        </ul>
      ) : failed || data?.status === "unavailable" ? (
        <p className="py-10 text-center text-sm text-slate">Grail&apos;s activity feeds didn&apos;t respond; try again in a moment.</p>
      ) : !data?.rows.length ? (
        <p className="py-10 text-center text-sm text-slate">No on-chain gToken activity in the last {days} days.</p>
      ) : (
        <ActivityList rows={data.rows} now={data.now} />
      )}
    </>
  );
}

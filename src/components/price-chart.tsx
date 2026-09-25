"use client";

import { useMemo, useRef, useState } from "react";
import { Area, Bar, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Candle } from "@/lib/grail/types";
import { formatPrice, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Segmented } from "./segmented";

type Range = "1d" | "7d" | "30d";

const RANGE_LABEL: Record<Range, string> = { "1d": "24 hours", "7d": "7 days", "30d": "30 days" };

interface Point {
  t: number;
  price: number;
  volume: number;
}

function toPoints(candles: Candle[], livePrice: number | null, now: number): Point[] {
  const pts = candles.map((c) => ({ t: c[0] * 1000, price: c[4], volume: c[5] }));
  if (livePrice && pts.length) pts.push({ t: now, price: livePrice, volume: 0 });
  return pts;
}

export function PriceChart({
  symbol,
  initial,
  livePrice,
  renderedAt,
}: {
  symbol: string;
  initial: Candle[];
  livePrice: number | null;
  renderedAt: number;
}) {
  const [range, setRange] = useState<Range>("7d");
  const [shown, setShown] = useState<Range>("7d");
  const [cache, setCache] = useState<Partial<Record<Range, Candle[]>>>({ "7d": initial });
  const [failed, setFailed] = useState<Partial<Record<Range, boolean>>>({});
  const latest = useRef<Range>("7d");

  const select = (next: Range) => {
    setRange(next);
    latest.current = next;
    if (cache[next]) return setShown(next);
    setFailed((f) => ({ ...f, [next]: false }));
    fetch(`/api/ohlcv/${symbol}?range=${next}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { candles: Candle[] }) => {
        setCache((c) => ({ ...c, [next]: d.candles }));
        if (latest.current === next) setShown(next);
      })
      .catch(() => setFailed((f) => ({ ...f, [next]: true })));
  };

  const loading = range !== shown && !failed[range];
  const error = failed[range] ? "Price history is unavailable right now. Try another range." : null;
  const data = useMemo(() => toPoints(cache[shown] ?? [], livePrice, renderedAt), [cache, shown, livePrice, renderedAt]);
  const first = data[0]?.price;
  const last = data.at(-1)?.price;
  const change = first && last ? ((last - first) / first) * 100 : null;
  const up = (change ?? 0) >= 0;
  const color = up ? "var(--up)" : "var(--down)";
  const volume = data.reduce((s, p) => s + p.volume, 0);
  const ticks = useMemo(() => {
    if (data.length < 2) return undefined;
    const step = (shown === "1d" ? 4 : shown === "7d" ? 24 : 24 * 5) * 3_600_000;
    const out: number[] = [];
    for (let t = Math.ceil(data[0].t / step) * step; t <= data[data.length - 1].t; t += step) out.push(t);
    return out;
  }, [data, shown]);
  const maxVol = Math.max(...data.map((p) => p.volume), 1);

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="chart-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 id="chart-title" className="font-display text-xl font-semibold tracking-tight">
            Price
          </h2>
          <p className="mt-1 text-sm text-slate">
            {change == null ? (
              "No trades in this range."
            ) : (
              <>
                <span className={cn("tabular font-medium", up ? "text-up" : "text-down")}>
                  {up ? "+" : "−"}
                  {Math.abs(change).toFixed(2)}%
                </span>{" "}
                over {RANGE_LABEL[shown]}, {formatUsd(volume, { compact: true })} traded
              </>
            )}
          </p>
        </div>
        <Segmented
          label="Chart range"
          size="sm"
          value={range}
          onChange={select}
          options={[
            { value: "1d", label: "24h" },
            { value: "7d", label: "7d" },
            { value: "30d", label: "30d" },
          ]}
        />
      </div>

      <div className={cn("relative mt-5 h-72 transition-opacity", loading && "opacity-50")}>
        {error ? (
          <p className="flex h-full items-center justify-center text-sm text-slate">{error}</p>
        ) : data.length < 2 ? (
          <p className="flex h-full items-center justify-center text-sm text-slate">
            Not enough trades in this range to draw a chart.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`fill-${symbol}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="t"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={ticks}
                tickFormatter={(t: number) =>
                  new Date(t).toLocaleString(
                    "en-US",
                    shown === "1d" ? { hour: "2-digit", minute: "2-digit", timeZone: "UTC" } : { month: "short", day: "numeric", timeZone: "UTC" },
                  )
                }
                tick={{ fontSize: 11, fill: "var(--slate)" }}
                axisLine={false}
                tickLine={false}
                minTickGap={48}
              />
              <YAxis yAxisId="price" domain={["auto", "auto"]} hide />
              <YAxis yAxisId="vol" domain={[0, maxVol * 4]} hide />
              <Tooltip
                cursor={{ stroke: "var(--hairline)", strokeWidth: 1 }}
                content={({ active, payload }) => {
                  const p = payload?.[0]?.payload as Point | undefined;
                  if (!active || !p) return null;
                  return (
                    <div className="rounded-xl border border-hairline bg-paper px-3 py-2 text-xs shadow-[var(--shadow-soft)]">
                      <div className="text-slate">
                        {new Date(p.t).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </div>
                      <div className="tabular mt-0.5 text-sm font-semibold">{formatPrice(p.price)}</div>
                      {p.volume > 0 && <div className="tabular text-slate">{formatUsd(p.volume)} volume</div>}
                    </div>
                  );
                }}
              />
              <Bar yAxisId="vol" dataKey="volume" fill="var(--gold)" opacity={0.45} radius={[2, 2, 0, 0]} isAnimationActive={false} />
              <Area
                yAxisId="price"
                type="linear"
                dataKey="price"
                stroke={color}
                strokeWidth={2}
                fill={`url(#fill-${symbol})`}
                animationDuration={700}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}

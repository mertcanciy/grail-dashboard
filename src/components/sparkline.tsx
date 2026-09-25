import type { Candle } from "@/lib/grail/types";

export function Sparkline({
  candles,
  width = 120,
  height = 36,
  className,
}: {
  candles: Candle[] | null | undefined;
  width?: number;
  height?: number;
  className?: string;
}) {
  const closes = (candles ?? []).map((c) => c[4]).filter(Number.isFinite);
  if (closes.length < 2) {
    return <svg width={width} height={height} className={className} aria-hidden="true" />;
  }
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const pts = closes.map((v, i) => [(i / (closes.length - 1)) * width, height - 3 - ((v - min) / span) * (height - 6)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const up = closes[closes.length - 1] >= closes[0];
  const color = up ? "var(--up)" : "var(--down)";
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <path d={`${d}L${width},${height}L0,${height}Z`} fill={color} opacity={0.08} />
      <path d={d} fill="none" stroke={color} strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

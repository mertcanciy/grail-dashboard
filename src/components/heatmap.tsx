import type { activityHeatmap } from "@/lib/metrics";
import { formatNumber, formatUsd } from "@/lib/format";
import { SectionHeading } from "./section-heading";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Grail's gold ramp, from the pale wash to the deep antique gold of the brand's dark theme. */
const GOLD_STOPS: [number, [number, number, number]][] = [
  [0, [247, 240, 220]],
  [0.35, [224, 200, 114]],
  [0.7, [201, 168, 76]],
  [1, [122, 97, 36]],
];

export function goldAt(t: number) {
  const x = Math.min(1, Math.max(0, t));
  const i = GOLD_STOPS.findIndex(([s]) => s >= x);
  if (i <= 0) return `rgb(${GOLD_STOPS[0][1].join(" ")})`;
  const [s0, c0] = GOLD_STOPS[i - 1];
  const [s1, c1] = GOLD_STOPS[i];
  const k = (x - s0) / (s1 - s0);
  return `rgb(${c0.map((v, j) => Math.round(v + (c1[j] - v) * k)).join(" ")})`;
}

export function Heatmap({ data }: { data: ReturnType<typeof activityHeatmap> }) {
  const { grid, max } = data;
  let peak = { day: 0, hour: 0, count: -1 };
  grid.forEach((row, d) => row.forEach((c, h) => c.count > peak.count && (peak = { day: d, hour: h, count: c.count })));
  const hourTotals = Array.from({ length: 24 }, (_, h) => grid.reduce((s, row) => s + row[h].count, 0));
  const busiestHour = hourTotals.indexOf(Math.max(...hourTotals));
  // A few bursty hours dominate, so a gentle power curve keeps quieter hours readable without flattening contrast.
  const intensity = (count: number) => (count / max) ** 0.7;

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="heatmap-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading id="heatmap-title" title="When the market is awake">
          Trades per hour over the last seven days, in UTC. Deeper gold means more swaps.
        </SectionHeading>
        <p className="text-sm text-slate">
          Busiest hour: <span className="font-medium text-graphite">{String(busiestHour).padStart(2, "0")}:00 UTC</span>
        </p>
      </div>
      <div className="mt-6 overflow-x-auto">
        <div className="grid min-w-[640px] grid-cols-[2.5rem_repeat(24,minmax(0,1fr))] gap-1">
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} className="tabular text-center text-[10px] text-slate">
              {h % 3 === 0 ? String(h).padStart(2, "0") : ""}
            </span>
          ))}
          {grid.map((row, d) => (
            <div key={DAYS[d]} className="contents">
              <span className="self-center text-xs text-slate">{DAYS[d]}</span>
              {row.map((c, h) => {
                const isPeak = d === peak.day && h === peak.hour && c.count > 0;
                return (
                  <span
                    key={h}
                    title={`${DAYS[d]} ${String(h).padStart(2, "0")}:00, ${formatNumber(c.count)} trades, ${formatUsd(c.volume)}`}
                    className="aspect-square rounded-[5px] transition-transform duration-200 hover:scale-110"
                    style={{
                      background: c.count === 0 ? "var(--muted)" : goldAt(0.08 + intensity(c.count) * 0.92),
                      boxShadow: isPeak ? "0 0 0 2px var(--graphite)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-x-5 gap-y-2 text-xs text-slate">
        <span className="flex items-center gap-2">
          Fewer
          <span className="flex gap-0.5" aria-hidden="true">
            {[0.08, 0.3, 0.5, 0.7, 0.85, 1].map((t) => (
              <span key={t} className="size-3 rounded-[3px]" style={{ background: goldAt(t) }} />
            ))}
          </span>
          More
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px] bg-muted" aria-hidden="true" />
          No trades
        </span>
        <span className="flex items-center gap-2">
          <span className="size-3 rounded-[3px] bg-gold shadow-[0_0_0_2px_var(--graphite)]" aria-hidden="true" />
          Busiest hour of the week
        </span>
      </div>
    </section>
  );
}

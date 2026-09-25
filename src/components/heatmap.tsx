import type { activityHeatmap } from "@/lib/metrics";
import { formatNumber, formatUsd } from "@/lib/format";
import { SectionHeading } from "./section-heading";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function Heatmap({ data }: { data: ReturnType<typeof activityHeatmap> }) {
  const { grid, max } = data;
  let peak = { day: 0, hour: 0, count: -1 };
  grid.forEach((row, d) => row.forEach((c, h) => c.count > peak.count && (peak = { day: d, hour: h, count: c.count })));
  const hourTotals = Array.from({ length: 24 }, (_, h) => grid.reduce((s, row) => s + row[h].count, 0));
  const busiestHour = hourTotals.indexOf(Math.max(...hourTotals));

  return (
    <section className="panel p-5 sm:p-7" aria-labelledby="heatmap-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading id="heatmap-title" title="When the market is awake">
          Trades per hour over the last seven days, in UTC. Darker cells saw more swaps.
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
                const t = c.count / max;
                const isPeak = d === peak.day && h === peak.hour && c.count > 0;
                return (
                  <span
                    key={h}
                    title={`${DAYS[d]} ${String(h).padStart(2, "0")}:00, ${formatNumber(c.count)} trades, ${formatUsd(c.volume)}`}
                    className="aspect-square rounded-[5px]"
                    style={{
                      background: c.count === 0 ? "var(--muted)" : `rgb(23 25 30 / ${0.08 + t * 0.82})`,
                      boxShadow: isPeak ? "0 0 0 2px var(--gold)" : undefined,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

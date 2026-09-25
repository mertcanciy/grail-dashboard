"use client";

import { useEffect, useRef } from "react";
import { animate, useInView, useReducedMotion } from "motion/react";
import { formatNumber, formatPercent, formatUsd } from "@/lib/format";

export type CountFormat = "usd" | "usd-compact" | "number" | "number-compact" | "percent";

function render(v: number, format: CountFormat) {
  switch (format) {
    case "usd":
      return formatUsd(v);
    case "usd-compact":
      return formatUsd(v, { compact: true });
    case "number-compact":
      return formatNumber(v, { compact: true });
    case "percent":
      return formatPercent(v);
    default:
      return formatNumber(v);
  }
}

export function CountUp({ value, format = "number", delay = 0 }: { value: number; format?: CountFormat; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const controls = animate(0, value, {
      duration: 1.4,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = render(v, format)),
    });
    return () => controls.stop();
  }, [inView, value, format, delay, reduce]);

  return (
    <span ref={ref} className="tabular">
      {render(value, format)}
    </span>
  );
}

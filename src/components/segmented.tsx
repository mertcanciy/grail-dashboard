"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  size = "md",
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-full bg-muted p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative whitespace-nowrap rounded-full font-medium transition-colors",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm",
              active ? "text-graphite" : "text-slate hover:text-graphite",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-full bg-paper shadow-[0_1px_2px_rgb(23_25_30/0.08),0_0_0_1px_var(--hairline)]"
                transition={{ type: "spring", stiffness: 480, damping: 36 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

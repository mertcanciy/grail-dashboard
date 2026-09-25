import { formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Change({
  value,
  className,
  variant = "text",
}: {
  value: number | string | null | undefined;
  className?: string;
  variant?: "text" | "pill";
}) {
  const v = Number(Number(value).toFixed(1));
  const tone = !Number.isFinite(v) || v === 0 ? "flat" : v > 0 ? "up" : "down";
  return (
    <span
      className={cn(
        "tabular inline-flex items-center font-medium",
        tone === "up" && "text-up",
        tone === "down" && "text-down",
        tone === "flat" && "text-slate",
        variant === "pill" && "rounded-full px-2 py-0.5 text-xs",
        variant === "pill" && tone === "up" && "bg-up/10",
        variant === "pill" && tone === "down" && "bg-down/10",
        variant === "pill" && tone === "flat" && "bg-muted",
        className,
      )}
    >
      {formatPercent(value, { sign: true })}
    </span>
  );
}

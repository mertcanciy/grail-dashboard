const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const compact2 = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

export function formatUsd(value: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (value == null || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (opts.compact && abs >= 10_000) return `${sign}$${compact.format(abs)}`;
  if (abs >= 1000) return `${sign}$${whole.format(abs)}`;
  if (abs >= 1) return `${sign}$${abs.toFixed(2)}`;
  if (abs === 0) return "$0";
  return `${sign}$${abs.toPrecision(abs < 0.01 ? 3 : 4).replace(/0+$/, "")}`;
}

/** Token prices range from $0.0015 to $40; keep ~4 significant digits. */
export function formatPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1000) return `$${whole.format(value)}`;
  if (value >= 1) return `$${value.toFixed(2)}`;
  return `$${Number(value.toPrecision(4))}`;
}

export function formatNumber(value: number | null | undefined, opts: { compact?: boolean } = {}) {
  if (value == null || !Number.isFinite(value)) return "—";
  if (opts.compact && Math.abs(value) >= 10_000) return compact2.format(value);
  return whole.format(value);
}

export function formatPercent(value: number | string | null | undefined, opts: { sign?: boolean; digits?: number } = {}) {
  const v = typeof value === "string" ? Number(value) : value;
  if (v == null || !Number.isFinite(v)) return "—";
  const digits = opts.digits ?? (Math.abs(v) >= 100 ? 0 : 1);
  const s = `${Math.abs(v).toFixed(digits)}%`;
  const rounded = Number(v.toFixed(digits));
  if (!opts.sign) return rounded < 0 ? `-${s}` : s;
  return rounded > 0 ? `+${s}` : rounded < 0 ? `−${s}` : s;
}

export function formatShare(fraction: number, digits = 1) {
  if (!Number.isFinite(fraction)) return "—";
  const pct = fraction * 100;
  if (pct > 0 && pct < 0.1) return "<0.1%";
  return `${pct.toFixed(pct >= 10 ? 0 : digits)}%`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto", style: "short" });

export function timeAgo(iso: string, now = Date.now()) {
  const diff = (Date.parse(iso) - now) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  return rtf.format(Math.round(diff / 86400), "day");
}

export function formatDate(iso: string | number) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export function formatTokenAmount(value: string | number) {
  const v = Number(value);
  if (!Number.isFinite(v)) return "—";
  if (v >= 10_000) return compact2.format(v);
  if (v >= 1) return v.toLocaleString("en-US", { maximumFractionDigits: 2 });
  return Number(v.toPrecision(3)).toString();
}

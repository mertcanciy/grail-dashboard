"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import type { Candle } from "@/lib/grail/types";
import { formatNumber, formatPrice, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Change } from "./change";
import { Segmented } from "./segmented";
import { Sparkline } from "./sparkline";

export interface TokenRow {
  slug: string;
  ticker: string;
  person: string;
  image: string;
  category: string;
  chain: string;
  quote: string;
  price: number | null;
  change1h: number;
  change24h: number;
  change7d: number;
  marketCap: number;
  volume24h: number;
  holders: number | null;
  vaulted: number;
  itemValue: number;
  listed: string;
  spark: Candle[];
}

type SortKey = "marketCap" | "volume24h" | "change24h" | "change7d" | "holders" | "itemValue" | "listed";

const COLUMNS: { key: SortKey; label: string; className?: string }[] = [
  { key: "change24h", label: "24h" },
  { key: "change7d", label: "7d" },
  { key: "marketCap", label: "Market cap" },
  { key: "volume24h", label: "Volume 24h" },
  { key: "holders", label: "Holders", className: "hidden md:table-cell" },
  { key: "itemValue", label: "One item", className: "hidden lg:table-cell" },
];

export function TokenTable({ rows, categories }: { rows: TokenRow[]; categories: string[] }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "marketCap", dir: -1 });
  const [category, setCategory] = useState("All");
  const [query, setQuery] = useState("");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => category === "All" || r.category === category)
      .filter((r) => !q || r.ticker.toLowerCase().includes(q) || r.person.toLowerCase().includes(q))
      .sort((a, b) => {
        const av = sort.key === "listed" ? Date.parse(a.listed) : (a[sort.key] ?? -Infinity);
        const bv = sort.key === "listed" ? Date.parse(b.listed) : (b[sort.key] ?? -Infinity);
        return (Number(av) - Number(bv)) * sort.dir;
      });
  }, [rows, sort, category, query]);

  const toggle = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: -1 }));

  return (
    <div className="panel p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="overflow-x-auto pb-1">
          <Segmented
            label="Category"
            size="sm"
            value={category}
            onChange={setCategory}
            options={["All", ...categories].map((c) => ({ value: c, label: c }))}
          />
        </div>
        <label className="relative block lg:w-72">
          <span className="sr-only">Search gTokens</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or ticker"
            className="h-10 w-full rounded-full border border-hairline bg-mist/60 pl-9 pr-4 text-sm outline-none transition-colors placeholder:text-slate focus:border-gold focus:bg-paper"
          />
        </label>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-hairline text-left text-xs text-slate">
              <th className="w-8 py-2.5 font-medium">#</th>
              <th className="py-2.5 font-medium">gToken</th>
              <th className="py-2.5 text-right font-medium">Price</th>
              {COLUMNS.map((c) => (
                <th key={c.key} className={cn("py-2.5 text-right font-medium", c.className)} aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
                  <button type="button" onClick={() => toggle(c.key)} className={cn("inline-flex items-center gap-1 rounded hover:text-graphite", sort.key === c.key && "text-graphite")}>
                    {c.label}
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
                  </button>
                </th>
              ))}
              <th className="hidden py-2.5 pl-4 text-right font-medium sm:table-cell">Last 7 days</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {visible.map((r, i) => (
              <tr key={r.slug} className="group transition-colors hover:bg-mist/70">
                <td className="tabular py-3 text-slate">{i + 1}</td>
                <td className="py-3">
                  <Link href={`/tokens/${r.slug}`} className="flex items-center gap-3">
                    <span className="relative size-10 shrink-0 overflow-hidden rounded-xl bg-muted">
                      <Image src={r.image} alt="" fill sizes="40px" className="object-cover" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-medium group-hover:text-gold-ink">{r.ticker}</span>
                      <span className="block truncate text-xs text-slate">
                        {r.person}, {r.category}
                        {r.chain !== "Base" ? `, ${r.chain}` : ""}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className="tabular py-3 text-right font-semibold">{formatPrice(r.price)}</td>
                <td className="py-3 text-right"><Change value={r.change24h} /></td>
                <td className="py-3 text-right"><Change value={r.change7d} /></td>
                <td className="tabular py-3 text-right">{formatUsd(r.marketCap, { compact: true })}</td>
                <td className="tabular py-3 text-right">{formatUsd(r.volume24h, { compact: true })}</td>
                <td className="tabular hidden py-3 text-right md:table-cell">{r.holders != null ? formatNumber(r.holders) : "—"}</td>
                <td className="tabular hidden py-3 text-right lg:table-cell">{formatUsd(r.itemValue, { compact: true })}</td>
                <td className="hidden py-3 pl-4 sm:table-cell">
                  <Sparkline candles={r.spark} width={112} height={32} className="ml-auto" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <p className="py-10 text-center text-sm text-slate">No gTokens match that search.</p>}
      </div>
    </div>
  );
}

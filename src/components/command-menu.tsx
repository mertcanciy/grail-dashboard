"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Search } from "lucide-react";
import type { SearchEntry, SearchKind } from "@/lib/search-index";
import { cn } from "@/lib/utils";

const GROUPS: { kind: SearchKind; label: string }[] = [
  { kind: "token", label: "gTokens" },
  { kind: "wallet", label: "Wallets" },
  { kind: "item", label: "Vaulted items" },
  { kind: "contract", label: "Contracts" },
];
const PER_GROUP = 6;
const USERNAME = /^[a-z0-9_.-]{2,32}$/;

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex() {
  indexPromise ??= fetch("/api/search")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .catch((e) => {
      indexPromise = null;
      throw e;
    });
  return indexPromise;
}

function score(e: SearchEntry, q: string) {
  const label = e.l.toLowerCase();
  if (label === q) return 100;
  if (label.startsWith(q)) return 80;
  if (label.includes(q)) return 60;
  // Vaulted items match on their certificate number only; their card titles would flood unrelated searches.
  if (e.k !== "item" && e.s?.toLowerCase().includes(q)) return 40;
  if (e.q?.includes(q)) return 20;
  return 0;
}

type Result = SearchEntry & { external?: boolean };

/** Direct jumps for things that don't need the index: full wallet addresses and transaction hashes. */
function directResults(q: string): Result[] {
  if (/^0x[0-9a-f]{40}$/.test(q)) return [{ k: "wallet", l: "Open this wallet", s: q, h: `/address/${q}` }];
  if (/^0x[0-9a-f]{64}$/.test(q)) {
    return [
      { k: "contract", l: "View transaction on Base", s: q, h: `https://basescan.org/tx/${q}`, external: true },
      { k: "contract", l: "View transaction on Robinhood Chain", s: q, h: `https://robinhoodchain.blockscout.com/tx/${q}`, external: true },
    ];
  }
  return [];
}

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  // Exact-username lookups against Grail for accounts the prebuilt index doesn't cover, cached per query.
  const [lookups, setLookups] = useState<Record<string, Result | null | "pending">>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  const show = useCallback(() => {
    setOpen(true);
    setFailed(false);
    loadIndex().then(setIndex, () => setFailed(true));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show]);

  const q = query.trim().toLowerCase();
  const indexHasExactWallet = useMemo(() => !!index?.some((e) => e.k === "wallet" && e.l.toLowerCase() === q), [index, q]);

  useEffect(() => {
    if (!USERNAME.test(q) || indexHasExactWallet || q in lookups) return;
    const timer = window.setTimeout(() => {
      setLookups((l) => ({ ...l, [q]: "pending" }));
      fetch(`/api/lookup?u=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((p: { username: string; wallet: string; avatar: string | null } | null) =>
          setLookups((l) => ({
            ...l,
            [q]: p ? { k: "wallet", l: p.username, s: `${p.wallet.slice(0, 6)}…${p.wallet.slice(-4)}`, h: `/address/${p.wallet}`, i: p.avatar ?? undefined } : null,
          })),
        )
        .catch(() => setLookups((l) => ({ ...l, [q]: null })));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [q, indexHasExactWallet, lookups]);

  const lookup = lookups[q];
  const results = useMemo<Result[]>(() => {
    const direct = directResults(q);
    if (!q) return index ? index.filter((e) => e.k === "token").slice(0, 8) : [];
    const extra = lookup && lookup !== "pending" ? lookup : null;
    if (!index) return extra ? [...direct, extra] : direct;
    const scored = index
      .map((e) => ({ e, s: score(e, q) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    const grouped = GROUPS.flatMap((g) => {
      const items: Result[] = scored.filter((x) => x.e.k === g.kind).slice(0, PER_GROUP).map((x) => x.e);
      if (g.kind === "wallet" && extra && !items.some((i) => i.h === extra.h)) items.unshift(extra);
      return items;
    });
    return [...direct, ...grouped];
  }, [index, q, lookup]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };

  const go = (r: Result) => {
    close();
    if (r.external || r.h.startsWith("http")) window.open(r.h, "_blank", "noopener,noreferrer");
    else router.push(r.h);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === "Escape") {
      close();
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={show}
        className="flex h-9 items-center gap-2 rounded-full bg-paper px-3 text-sm text-slate shadow-[0_0_0_1px_var(--hairline)] transition-colors hover:text-graphite"
        aria-label="Search gTokens, wallets and certificates"
      >
        <Search className="size-4" aria-hidden="true" />
        <span className="hidden lg:inline">Search</span>
        <kbd className="hidden rounded-md bg-mist px-1.5 py-0.5 font-sans text-[11px] text-slate lg:inline">⌘K</kbd>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-start justify-center bg-graphite/20 px-4 pt-[12vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onMouseDown={(e) => e.target === e.currentTarget && close()}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Search"
              className="w-full max-w-xl overflow-hidden rounded-2xl border border-hairline bg-paper shadow-[0_24px_60px_-20px_rgb(23_25_30/0.35)]"
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="flex items-center gap-3 border-b border-hairline px-4">
                <Search className="size-4 shrink-0 text-slate" aria-hidden="true" />
                <input
                  ref={inputRef}
                  autoFocus
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setActive(0);
                  }}
                  onKeyDown={onInputKey}
                  placeholder="Search a gToken, wallet, username, PSA cert or address"
                  className="h-14 w-full bg-transparent text-[15px] outline-none placeholder:text-slate"
                  role="combobox"
                  aria-expanded="true"
                  aria-controls={listId}
                  aria-activedescendant={results[active] ? `${listId}-${active}` : undefined}
                />
                <kbd className="rounded-md bg-mist px-1.5 py-0.5 text-[11px] text-slate">Esc</kbd>
              </div>

              <ul id={listId} role="listbox" className="max-h-[60vh] overflow-y-auto p-2">
                {failed && <li className="px-3 py-6 text-center text-sm text-slate">Search didn&apos;t load. Close and try again.</li>}
                {!failed && !index && !results.length && <li className="px-3 py-6 text-center text-sm text-slate">Loading…</li>}
                {!failed && index && q && !results.length && (
                  <li className="px-3 py-6 text-center text-sm text-slate">
                    {lookup === "pending" || (USERNAME.test(q) && !(q in lookups))
                      ? "Checking Grail accounts…"
                      : <>Nothing matches &ldquo;{query}&rdquo;.</>}
                  </li>
                )}
                {results.map((r, i) => {
                  const heading = i === 0 || results[i - 1].k !== r.k ? (q ? GROUPS.find((g) => g.kind === r.k)?.label : "gTokens") : null;
                  return (
                    <li key={`${r.k}-${r.h}-${r.l}-${i}`} role="presentation">
                      {heading && <p className="px-3 pb-1 pt-2 text-xs font-medium text-slate">{heading}</p>}
                      <button
                        id={`${listId}-${i}`}
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseMove={() => setActive(i)}
                        onClick={() => go(r)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm",
                          i === active ? "bg-mist" : "hover:bg-mist/60",
                        )}
                      >
                        {r.i ? (
                          <span className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-muted">
                            <Image src={r.i} alt="" fill sizes="32px" className="object-cover" />
                          </span>
                        ) : (
                          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-gold-wash text-xs font-semibold text-gold-ink">
                            {r.k === "wallet" ? "W" : r.k === "item" ? "✓" : "#"}
                          </span>
                        )}
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{r.l}</span>
                          {r.s && <span className="block truncate text-xs text-slate">{r.s}</span>}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

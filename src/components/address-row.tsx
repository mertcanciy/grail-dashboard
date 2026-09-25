"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { shortAddress } from "@/lib/metrics";

export function AddressRow({
  label,
  hint,
  value,
  href,
}: {
  label: string;
  hint?: string;
  value: string;
  href?: string;
}) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-slate">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <code className="tabular rounded-lg bg-mist px-2 py-1 text-[12.5px] text-graphite" title={value}>
          {shortAddress(value, 6, 4)}
        </code>
        <button
          type="button"
          onClick={copy}
          aria-label={copied ? `${label} copied` : `Copy ${label}`}
          className="relative grid size-8 place-items-center rounded-lg text-slate transition-colors hover:bg-mist hover:text-graphite"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={copied ? "ok" : "copy"}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {copied ? <Check className="size-4 text-up" /> : <Copy className="size-4" />}
            </motion.span>
          </AnimatePresence>
        </button>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open ${label} in block explorer`}
            className="grid size-8 place-items-center rounded-lg text-slate transition-colors hover:bg-mist hover:text-graphite"
          >
            <ExternalLink className="size-4" />
          </a>
        )}
      </div>
    </div>
  );
}

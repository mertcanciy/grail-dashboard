"use client";

import Image from "next/image";
import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { FALLBACK_IMAGE, explorerTx } from "@/lib/grail/meta";
import { certLink } from "@/lib/metrics";
import type { VaultItem } from "@/lib/grail/types";
import { formatDate } from "@/lib/format";

const INITIAL = 12;

export function SlabGrid({ items, itemName, chainId }: { items: VaultItem[]; itemName: string; chainId: number }) {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return <p className="text-xs text-slate">Grail hasn&apos;t published the individual items for this one yet.</p>;
  const shown = expanded ? items : items.slice(0, INITIAL);

  return (
    <div>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {shown.map((it, i) => {
          const cert = certLink(it.reference_id, itemName);
          const tx = it.register_tx_hash ? explorerTx(it.chain_id ?? chainId, it.register_tx_hash) : undefined;
          return (
            <li key={`${it.reference_id}-${i}`} className="overflow-hidden rounded-xl border border-hairline bg-paper">
              <div className="relative aspect-[3/4] bg-[radial-gradient(120%_80%_at_50%_0%,#ffffff_0%,#eef0f4_70%)]">
                <Image
                  src={it.image_url || FALLBACK_IMAGE}
                  alt={cert ? `${cert.grader} cert ${it.reference_id}` : itemName}
                  fill
                  sizes="(min-width:1280px) 160px, (min-width:640px) 30vw, 45vw"
                  className="object-contain p-2"
                />
              </div>
              <div className="space-y-0.5 px-2.5 py-2 text-[11.5px]">
                {cert ? (
                  <a href={cert.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium hover:text-gold-ink">
                    <ShieldCheck className="size-3.5 text-up" aria-hidden="true" />
                    <span className="tabular">
                      {cert.grader} {it.reference_id}
                    </span>
                  </a>
                ) : (
                  <span className="block truncate font-medium" title={it.reference_id}>
                    {it.reference_id}
                  </span>
                )}
                {tx ? (
                  <a href={tx} target="_blank" rel="noreferrer" className="block text-slate hover:text-graphite">
                    Registered {it.registered_at ? formatDate(it.registered_at) : "on-chain"}
                  </a>
                ) : (
                  <span className="block text-slate">{it.status === "REGISTERED" ? "Registered" : it.status}</span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {items.length > INITIAL && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-3 rounded-full bg-mist px-3.5 py-1.5 text-sm font-medium text-graphite transition-colors hover:bg-muted"
        >
          {expanded ? "Show fewer" : `Show all ${items.length}`}
        </button>
      )}
    </div>
  );
}

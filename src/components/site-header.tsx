"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { cn } from "@/lib/utils";
import { GrailMark } from "./grail-mark";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/tokens", label: "gTokens" },
  { href: "/traders", label: "Traders" },
  { href: "/packs", label: "Packs" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [raised, setRaised] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setRaised(y > 12));

  const active = NAV.findLast((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))?.href;

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <motion.header
        animate={{
          boxShadow: raised ? "0 1px 2px rgb(23 25 30 / 0.04), 0 12px 32px -16px rgb(23 25 30 / 0.18)" : "0 0 0 rgb(0 0 0 / 0)",
          backgroundColor: raised ? "rgb(255 255 255 / 0.82)" : "rgb(255 255 255 / 0)",
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 rounded-2xl px-3 backdrop-blur-xl sm:px-4"
      >
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label="Grail Pulse home">
          <GrailMark className="size-8" />
          <span className="font-display text-[17px] font-semibold tracking-tight">
            Grail Pulse
          </span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-0.5 overflow-x-auto">
          {NAV.map((item) => {
            const isActive = active === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-3.5",
                  isActive ? "text-graphite" : "text-slate hover:text-graphite",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-paper shadow-[0_0_0_1px_var(--hairline),0_4px_12px_-6px_rgb(23_25_30/0.2)]"
                    transition={{ type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <a
          href="https://grail.xyz"
          target="_blank"
          rel="noreferrer"
          className="hidden rounded-full bg-graphite px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-black md:inline-flex"
        >
          Trade on Grail
        </a>
      </motion.header>
    </div>
  );
}

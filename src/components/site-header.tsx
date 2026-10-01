"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { GrailMark } from "./grail-mark";
import { CommandMenu } from "./command-menu";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/tokens", label: "gTokens" },
  { href: "/vault", label: "Vault" },
  { href: "/traders", label: "Traders" },
  { href: "/packs", label: "Packs" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [raised, setRaised] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setRaised(y > 12));

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const active = NAV.findLast((n) => (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href)))?.href;
  const elevated = raised || menuOpen;

  return (
    <div className="sticky top-0 z-40 px-3 pt-3 sm:px-6">
      <motion.header
        animate={{
          boxShadow: elevated ? "0 1px 2px rgb(23 25 30 / 0.04), 0 12px 32px -16px rgb(23 25 30 / 0.18)" : "0 0 0 rgb(0 0 0 / 0)",
          backgroundColor: elevated ? "rgb(255 255 255 / 0.9)" : "rgb(255 255 255 / 0)",
        }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="relative mx-auto max-w-7xl rounded-2xl backdrop-blur-xl"
      >
        <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5 rounded-lg" aria-label="Grail Dashboard home" onClick={() => setMenuOpen(false)}>
            <GrailMark className="size-8" />
            <span className="whitespace-nowrap font-display text-[17px] font-semibold tracking-tight">Grail Dashboard</span>
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-0.5 md:flex">
            {NAV.map((item) => {
              const isActive = active === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "relative rounded-full px-3 py-1.5 text-sm font-medium transition-colors lg:px-3.5",
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

          <div className="flex shrink-0 items-center gap-2">
            <CommandMenu />
            <a
              href="https://grail.xyz"
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-full bg-graphite px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-black xl:inline-flex"
            >
              Trade on Grail
            </a>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="grid size-9 place-items-center rounded-full bg-paper text-graphite shadow-[0_0_0_1px_var(--hairline)] md:hidden"
            >
              {menuOpen ? <X className="size-4" aria-hidden="true" /> : <Menu className="size-4" aria-hidden="true" />}
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {menuOpen && (
            <motion.nav
              id="mobile-nav"
              aria-label="Main"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden md:hidden"
            >
              <ul className="space-y-0.5 border-t border-hairline px-2 pb-3 pt-2">
                {NAV.map((item) => {
                  const isActive = active === item.href;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-2.5 text-[15px] font-medium",
                          isActive ? "bg-mist text-graphite" : "text-slate hover:bg-mist/60 hover:text-graphite",
                        )}
                      >
                        {item.label}
                        {isActive && <span className="size-1.5 rounded-full bg-gold" aria-hidden="true" />}
                      </Link>
                    </li>
                  );
                })}
                <li className="pt-1">
                  <a
                    href="https://grail.xyz"
                    target="_blank"
                    rel="noreferrer"
                    className="flex justify-center rounded-xl bg-graphite px-3 py-2.5 text-[15px] font-medium text-paper"
                  >
                    Trade on Grail
                  </a>
                </li>
              </ul>
            </motion.nav>
          )}
        </AnimatePresence>
      </motion.header>
    </div>
  );
}

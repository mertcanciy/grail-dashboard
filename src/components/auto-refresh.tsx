"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Pages are ISR-cached on the server. This quietly re-requests the current page's server data on an interval
 * (and when a tab comes back into focus), so a dashboard left open keeps up without a reload.
 * Client state such as selected tabs survives the refresh.
 */
export function AutoRefresh({ intervalMs = 120_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    let last = Date.now();
    const refresh = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) return;
      last = Date.now();
      router.refresh();
    };
    const id = window.setInterval(refresh, intervalMs);
    const onVisible = () => document.visibilityState === "visible" && Date.now() - last > intervalMs && refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);

  return null;
}

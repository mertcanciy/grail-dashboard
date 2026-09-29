"use client";

import { useSyncExternalStore } from "react";

const TICK_MS = 15_000;
const listeners = new Set<() => void>();
let clock = 0;
let timer: number | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  clock = Date.now();
  timer ??= window.setInterval(() => {
    clock = Date.now();
    for (const l of listeners) l();
  }, TICK_MS);
  return () => {
    listeners.delete(listener);
    if (!listeners.size && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

/**
 * Wall-clock time shared by every relative timestamp on the page, ticking every 15 seconds.
 * Renders `serverNow` on the server and during hydration so the markup matches, then switches to the client clock.
 */
export function useNow(serverNow: number) {
  return useSyncExternalStore(
    subscribe,
    () => clock || Date.now(),
    () => serverNow,
  );
}

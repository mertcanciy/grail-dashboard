import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReactNode } from "react";
import type { Candle } from "./grail/types";

export const OG_SIZE = { width: 1200, height: 630 };

export const OG = {
  mist: "#f3f4f7",
  paper: "#ffffff",
  graphite: "#17191e",
  slate: "#5d6371",
  hairline: "#e2e5eb",
  gold: "#c9a84c",
  goldInk: "#7c6320",
  up: "#16895c",
  down: "#cf4b3f",
};

/** Google Fonts serves TrueType (which the OG renderer needs) when the request has no browser user agent. */
async function googleFont(family: string, weight: number) {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@${weight}`, {
    cache: "force-cache",
  }).then((r) => r.text());
  const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
  if (!url) throw new Error(`No TTF for ${family}`);
  return fetch(url, { cache: "force-cache" }).then((r) => r.arrayBuffer());
}

export async function ogFonts() {
  const [display, body] = await Promise.all([googleFont("Bricolage Grotesque", 700), googleFont("Inter", 500)]);
  return [
    { name: "Bricolage", data: display, weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: body, weight: 500 as const, style: "normal" as const },
  ];
}

let logo: Promise<string> | null = null;
export function ogLogo() {
  logo ??= readFile(join(process.cwd(), "public/grail-logo.jpg"), "base64").then((b) => `data:image/jpeg;base64,${b}`);
  return logo;
}

export function sparkPath(candles: Candle[], width: number, height: number) {
  const closes = candles.map((c) => c[4]).filter(Number.isFinite);
  if (closes.length < 2) return null;
  const min = Math.min(...closes);
  const span = Math.max(...closes) - min || 1;
  return closes
    .map((v, i) => `${i ? "L" : "M"}${((i / (closes.length - 1)) * width).toFixed(1)},${(height - 6 - ((v - min) / span) * (height - 12)).toFixed(1)}`)
    .join("");
}

export function OgFrame({ logoSrc, children, footer }: { logoSrc: string; children: ReactNode; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: OG.mist,
        padding: 56,
        fontFamily: "Inter",
        color: OG.graphite,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoSrc} width={52} height={52} style={{ borderRadius: 14 }} alt="" />
        <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 30 }}>Grail Dashboard</div>
      </div>
      <div style={{ display: "flex", flex: 1, flexDirection: "column", justifyContent: "center" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 22, color: OG.slate }}>
        <div style={{ display: "flex" }}>{footer}</div>
        <div style={{ display: "flex", width: 180, height: 4, borderRadius: 4, background: OG.gold }} />
      </div>
    </div>
  );
}

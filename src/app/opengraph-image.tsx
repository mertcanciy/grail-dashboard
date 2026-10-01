import { ImageResponse } from "next/og";
import { getStatistics, getTokens } from "@/lib/grail/api";
import { ticker, vaultedItems } from "@/lib/grail/meta";
import { formatNumber, formatUsd } from "@/lib/format";
import { OG, OG_SIZE, OgFrame, ogFonts, ogLogo } from "@/lib/og";

export const revalidate = 600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Grail Dashboard: live data for every Grail gToken";

export default async function Image() {
  const [{ tokens, totalMarketCap }, stats, fonts, logoSrc] = await Promise.all([
    getTokens({ timeframe: "1d", windowDays: 1 }),
    getStatistics(),
    ogFonts(),
    ogLogo(),
  ]);
  const vaulted = tokens.reduce((s, t) => s + vaultedItems(t).total, 0);
  const volume = stats?.volume_24h_usd ?? tokens.reduce((s, t) => s + Number(t.volume_24h || 0), 0);
  const figures = [
    ["Market cap", formatUsd(totalMarketCap, { compact: true })],
    ["Volume 24h", formatUsd(volume, { compact: true })],
    ["Holders", stats ? formatNumber(stats.distinct_holders) : "—"],
    ["Items in vault", formatNumber(vaulted)],
  ];
  const top = [...tokens].sort((a, b) => Number(b.market_cap) - Number(a.market_cap)).slice(0, 6).map(ticker);

  return new ImageResponse(
    <OgFrame logoSrc={logoSrc} footer={top.join("  ")}>
      <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 76, letterSpacing: -2.5, lineHeight: 1.02, maxWidth: 980 }}>
        Every gToken, every trade, every card in the vault.
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 44 }}>
        {figures.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "flex",
              flexDirection: "column",
              background: OG.paper,
              border: `1px solid ${OG.hairline}`,
              borderRadius: 22,
              padding: "20px 26px",
              minWidth: 240,
            }}
          >
            <div style={{ display: "flex", fontSize: 22, color: OG.slate }}>{label}</div>
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 44, marginTop: 6 }}>{value}</div>
          </div>
        ))}
      </div>
    </OgFrame>,
    { ...size, fonts },
  );
}

import { ImageResponse } from "next/og";
import { clipToWindow, getToken } from "@/lib/grail/api";
import { chainOf, personName, ticker, vaultedItems } from "@/lib/grail/meta";
import { formatPercent, formatPrice, formatUsd } from "@/lib/format";
import { OG, OG_SIZE, OgFrame, ogFonts, ogLogo, sparkPath } from "@/lib/og";

export const revalidate = 600;
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "gToken price and vault summary on Grail Pulse";

export default async function Image({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  const [token, fonts, logoSrc] = await Promise.all([getToken(symbol, { timeframe: "1h", windowDays: 7 }), ogFonts(), ogLogo()]);

  if (!token) {
    return new ImageResponse(
      <OgFrame logoSrc={logoSrc} footer="grail-dashboard">
        <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 72 }}>gToken not found</div>
      </OgFrame>,
      { ...size, fonts },
    );
  }

  const change = Number(token.price_change_24h_percent);
  const color = change > 0 ? OG.up : change < 0 ? OG.down : OG.slate;
  const path = sparkPath(clipToWindow(token.ohlcv_list ?? [], 7), 460, 200);
  const stats = [
    ["Market cap", formatUsd(Number(token.market_cap), { compact: true })],
    ["Volume 24h", formatUsd(Number(token.volume_24h), { compact: true })],
    ["In the vault", `${vaultedItems(token).total} items`],
  ];

  return new ImageResponse(
    <OgFrame logoSrc={logoSrc} footer={`On ${chainOf(token.chain_id).name}, backed by vaulted collectibles`}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 96, letterSpacing: -3, lineHeight: 1 }}>{ticker(token)}</div>
          <div style={{ display: "flex", fontSize: 32, color: OG.slate, marginTop: 10 }}>{personName(token)}</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 34 }}>
            <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 80, letterSpacing: -2 }}>{formatPrice(token.market_price)}</div>
            <div style={{ display: "flex", fontSize: 36, color }}>{formatPercent(change, { sign: true })} 24h</div>
          </div>
          <div style={{ display: "flex", gap: 40, marginTop: 30 }}>
            {stats.map(([label, value]) => (
              <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", fontSize: 22, color: OG.slate }}>{label}</div>
                <div style={{ display: "flex", fontFamily: "Bricolage", fontSize: 34, marginTop: 4 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
        {path && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: OG.paper,
              border: `1px solid ${OG.hairline}`,
              borderRadius: 28,
              padding: 28,
            }}
          >
            <div style={{ display: "flex", fontSize: 20, color: OG.slate, marginBottom: 12 }}>Last 7 days</div>
            <svg width={460} height={200} viewBox="0 0 460 200">
              <path d={`${path}L460,200L0,200Z`} fill={color} fillOpacity={0.1} />
              <path d={path} fill="none" stroke={color} strokeWidth={4} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </div>
        )}
      </div>
    </OgFrame>,
    { ...size, fonts },
  );
}

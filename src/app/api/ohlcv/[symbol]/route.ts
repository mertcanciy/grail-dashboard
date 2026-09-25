import { NextResponse, type NextRequest } from "next/server";
import { OHLCV_RANGES, clipToWindow, getToken, type OhlcvRange } from "@/lib/grail/api";

export async function GET(req: NextRequest, ctx: RouteContext<"/api/ohlcv/[symbol]">) {
  const { symbol } = await ctx.params;
  const range = OHLCV_RANGES[(req.nextUrl.searchParams.get("range") ?? "7d") as OhlcvRange];
  if (!range || !/^[a-z0-9]{1,20}$/i.test(symbol)) {
    return NextResponse.json({ error: "Unknown symbol or range" }, { status: 400 });
  }
  const token = await getToken(symbol, range);
  if (!token) return NextResponse.json({ error: "Token not found" }, { status: 404 });
  return NextResponse.json(
    { candles: clipToWindow(token.ohlcv_list ?? [], range.windowDays), price: token.market_price },
    { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } },
  );
}

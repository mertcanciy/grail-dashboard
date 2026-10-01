import { NextResponse, type NextRequest } from "next/server";
import { isAddress } from "viem";
import { loadChainActivity } from "@/lib/wallet";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/address/[address]/activity">) {
  const address = (await ctx.params).address.toLowerCase();
  if (!isAddress(address)) return NextResponse.json({ error: "Invalid address" }, { status: 400 });
  return NextResponse.json(await loadChainActivity(address), {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
  });
}

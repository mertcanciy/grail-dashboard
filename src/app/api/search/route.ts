import { NextResponse } from "next/server";
import { buildSearchIndex } from "@/lib/search-index";

export const revalidate = 300;

export async function GET() {
  const entries = await buildSearchIndex();
  return NextResponse.json(entries, {
    headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" },
  });
}

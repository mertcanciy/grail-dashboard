import { NextResponse, type NextRequest } from "next/server";
import { getProfileOverview } from "@/lib/grail/api";

/** Grail usernames: letters, digits, underscore, dot and dash. */
const USERNAME = /^[a-z0-9_.-]{2,32}$/i;

/**
 * Exact-username lookup for search. The prebuilt index only covers wallets that appear in top-holder and
 * leaderboard lists; this finds any other Grail account by name.
 */
export async function GET(req: NextRequest) {
  const u = req.nextUrl.searchParams.get("u")?.trim() ?? "";
  if (!USERNAME.test(u)) return NextResponse.json({ error: "Invalid username" }, { status: 400 });

  const profile = await getProfileOverview(u).catch(() => null);
  const body = profile
    ? {
        username: profile.username ?? profile.display_name,
        wallet: profile.wallet_address.toLowerCase(),
        avatar: profile.avatar_url,
        twitter: profile.twitter_username,
      }
    : null;
  return NextResponse.json(body, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}

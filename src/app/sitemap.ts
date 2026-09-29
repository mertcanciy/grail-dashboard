import type { MetadataRoute } from "next";
import { getTokens } from "@/lib/grail/api";
import { slugOf } from "@/lib/grail/meta";
import { siteUrl } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = ["", "/tokens", "/vault", "/traders", "/packs"].map((path) => ({
    url: `${siteUrl}${path}`,
    changeFrequency: "hourly",
    priority: path ? 0.8 : 1,
  }));
  try {
    const { tokens } = await getTokens({ timeframe: "1d", windowDays: 1 });
    pages.push(
      ...tokens.map((t) => ({ url: `${siteUrl}/tokens/${slugOf(t)}`, changeFrequency: "hourly" as const, priority: 0.6 })),
    );
  } catch {
    // The static pages are still worth listing when Grail is unreachable.
  }
  return pages;
}

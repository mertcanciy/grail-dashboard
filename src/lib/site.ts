/** Public address of the site; share images, the sitemap and robots.txt point here. */
export const PRODUCTION_URL = "https://graildashboard.vercel.app";

/** Earlier production address, now redirected to `PRODUCTION_URL`. */
export const LEGACY_HOSTS = ["grail-dashboard-seven.vercel.app"];

export const siteUrl = process.env.VERCEL ? PRODUCTION_URL : "http://localhost:3000";

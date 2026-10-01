import type { NextConfig } from "next";
import { LEGACY_HOSTS, PRODUCTION_URL } from "./src/lib/site";

const nextConfig: NextConfig = {
  // Bounds how long a CDN may keep serving a stale ISR page while it revalidates (Next's default is a year).
  expireTime: 3600,
  images: {
    remotePatterns: [new URL("https://grailxyz-public.s3.us-east-2.amazonaws.com/images/**")],
  },
  async redirects() {
    return LEGACY_HOSTS.map((host) => ({
      source: "/:path*",
      has: [{ type: "host" as const, value: host }],
      destination: `${PRODUCTION_URL}/:path*`,
      permanent: true,
    }));
  },
};

export default nextConfig;

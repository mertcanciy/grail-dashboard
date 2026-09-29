import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bounds how long a CDN may keep serving a stale ISR page while it revalidates (Next's default is a year).
  expireTime: 3600,
  images: {
    remotePatterns: [new URL("https://grailxyz-public.s3.us-east-2.amazonaws.com/images/**")],
  },
};

export default nextConfig;

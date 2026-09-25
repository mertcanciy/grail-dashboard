import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [new URL("https://grailxyz-public.s3.us-east-2.amazonaws.com/images/**")],
  },
};

export default nextConfig;

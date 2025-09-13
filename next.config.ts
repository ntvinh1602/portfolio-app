import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],
  env: {
    DEMO_USER_ID: process.env.NEXT_PUBLIC_DEMO_USER_ID,
  },
  allowedDevOrigins: ['192.168.100.5'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "s3-symbol-logo.tradingview.com",
      },
      {
        protocol: "https",
        hostname: "is1-ssl.mzstatic.com",
      },
    ],
  },
};

export default nextConfig;

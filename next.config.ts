import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],
  async redirects() {
    return [
      {
        source: "/flights/history",
        destination: "/flights/cards",
        permanent: true,
      },
    ]
  },
  env: {},
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

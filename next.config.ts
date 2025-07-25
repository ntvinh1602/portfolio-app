import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],
  env: {
    DEMO_USER_ID: process.env.NEXT_PUBLIC_DEMO_USER_ID,
  },
  allowedDevOrigins: ['192.168.100.5'],
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
})(nextConfig as any);

import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@supabase/ssr", "@supabase/supabase-js"],
};

export default withPWA({
  dest: "public",
  disable: false,
})(nextConfig as any);

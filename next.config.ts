import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  outputFileTracingIncludes: { "/*": ["./src/assets/**"] },
  images: { remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL ? [{ protocol: "https", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, pathname: "/storage/v1/object/public/product-images/**" }] : [] },
};

export default nextConfig;

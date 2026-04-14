import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Force Next/Turbopack to treat THIS folder as the root
    root: __dirname,
  },
};

export default nextConfig;

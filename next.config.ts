import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the root so a stray lockfile/workspace file higher up the tree isn't picked up.
  turbopack: { root: __dirname },
};

export default nextConfig;

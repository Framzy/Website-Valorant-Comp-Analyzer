import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // better-sqlite3 is a native module: keep it out of the bundler.
  serverExternalPackages: ["better-sqlite3"],
  images: {
    // Agent portraits come from Riot's CDN (and one local asset for veto).
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "cmsassets.rgpub.io" },
      { protocol: "https", hostname: "media.valorant-api.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

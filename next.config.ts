import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pins the project root to this folder so Turbopack doesn't infer it from
  // the parent directory's package-lock.json (an unrelated, non-workspace
  // project one level up at ../package-lock.json).
  turbopack: {
    root: path.join(__dirname),
  },
  // Turbopack's persistent filesystem cache (.next/dev/cache/turbopack,
  // on by default since Next 16.1) writes an SST-based database that this
  // project's location under a OneDrive-synced folder repeatedly corrupted
  // ("Unable to write SST file", "Failed to restore task data"), since
  // OneDrive's background sync locks/moves files Turbopack expects to own
  // exclusively. Disabled here in favor of a same-session in-memory cache,
  // which is slightly slower to warm up but immune to this corruption.
  experimental: {
    turbopackFileSystemCacheForDev: false,
    turbopackFileSystemCacheForBuild: false,
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

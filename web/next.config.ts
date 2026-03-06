import type { NextConfig } from "next";
import path from "path";

// leaflet.gridlayer.googlemutant's "browser" dist is a bare IIFE that depends on
// window.L, which does not exist in webpack/Turbopack bundles. Both bundlers must
// resolve the package to its ESM source, which imports from "leaflet" as a proper
// module and works correctly inside a bundled client component.
//
// Turbopack resolveAlias requires a project-relative path (no absolute paths).
// webpack resolveAlias requires an absolute path.
const googlemutantEsmRelative =
  "./node_modules/leaflet.gridlayer.googlemutant/src/Leaflet.GoogleMutant.mjs";
const googlemutantEsmAbsolute = path.resolve(process.cwd(), googlemutantEsmRelative.slice(2));

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost",
    "127.0.0.1",
    "192.168.1.171",
    "dev-aiguide",
  ],
  // Turbopack (default in Next.js 16+) — relative path from project root
  turbopack: {
    resolveAlias: {
      "leaflet.gridlayer.googlemutant": googlemutantEsmRelative,
    },
  },
  // webpack (used when --webpack flag is passed or in production builds) — absolute path
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "leaflet.gridlayer.googlemutant": googlemutantEsmAbsolute,
    };
    return config;
  },
};

export default nextConfig;

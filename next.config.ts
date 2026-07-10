import type { NextConfig } from "next";

const nextConfig = {
  reactCompiler: true,
  turbopack: {
    resolveAlias: {
      "expo-sqlite": "./src/lib/expo-sqlite-stub.js",
    },
  },
} satisfies NextConfig;

export default nextConfig;

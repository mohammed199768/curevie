const createNextIntlPlugin = require("next-intl/plugin");

const withNextIntl = createNextIntlPlugin("./i18n.ts");

/** @type {import("next").NextConfig} */
const nextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@radix-ui/react-icons",
      "date-fns",
    ],
  },
  webpack: (config) => {
    // The local Windows dev environment has shown partial webpack cache writes
    // that leave missing vendor chunks in .next/server. Keep an escape hatch for
    // that case without disabling webpack caching for every local run.
    if (process.env.DISABLE_NEXT_WEBPACK_CACHE === "1") {
      config.cache = false;
    }
    return config;
  },
};

module.exports = withNextIntl(nextConfig);


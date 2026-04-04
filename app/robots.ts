import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const dashboardDisallowPaths = [
  "/en/dashboard",
  "/en/requests",
  "/en/invoices",
  "/en/reports",
  "/en/chat",
  "/en/notifications",
  "/en/profile",
  "/ar/dashboard",
  "/ar/requests",
  "/ar/invoices",
  "/ar/reports",
  "/ar/chat",
  "/ar/notifications",
  "/ar/profile",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: dashboardDisallowPaths,
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}

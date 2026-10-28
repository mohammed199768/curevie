import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

// Account pages are not blocked here on purpose: they carry `noindex`, and Google can only
// honour that tag on pages it is allowed to crawl (blocking them yields "Indexed, though
// blocked by robots.txt"). Tracking links hold a private token and are never linked
// publicly, so they stay blocked outright.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/en/track/", "/ar/track/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

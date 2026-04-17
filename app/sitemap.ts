import type { MetadataRoute } from "next";
import { buildAbsoluteUrl, buildLocaleAlternates } from "@/lib/seo";
import { PUBLIC_SERVICE_CATEGORIES } from "@/lib/public-service-categories";

const locales = ["en", "ar"] as const;
const serviceSlugs = PUBLIC_SERVICE_CATEGORIES.map((category) => category.slug);
const lastModified = new Date();

const staticPublicRoutes = [
  { pathname: "", changeFrequency: "weekly" as const, priority: 1 },
  { pathname: "/services", changeFrequency: "weekly" as const, priority: 0.95 },
  { pathname: "/about", changeFrequency: "monthly" as const, priority: 0.8 },
  { pathname: "/contact", changeFrequency: "monthly" as const, priority: 0.8 },
  { pathname: "/privacy", changeFrequency: "yearly" as const, priority: 0.5 },
  { pathname: "/cookies", changeFrequency: "yearly" as const, priority: 0.5 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = staticPublicRoutes.flatMap((route) =>
    locales.map((locale) => ({
      url: buildAbsoluteUrl(`/${locale}${route.pathname}`),
      lastModified,
      changeFrequency: route.changeFrequency,
      priority: route.priority,
      alternates: {
        languages: buildLocaleAlternates(route.pathname),
      },
    })),
  );

  const serviceRoutes = serviceSlugs.flatMap((slug) =>
    locales.map((locale) => ({
      url: buildAbsoluteUrl(`/${locale}/services/${slug}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.9,
      alternates: {
        languages: buildLocaleAlternates(`/services/${slug}`),
      },
    })),
  );

  return [...publicRoutes, ...serviceRoutes];
}

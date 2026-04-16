import type { Metadata } from "next";
import { PublicAboutExperience } from "@/components/about/PublicAboutExperience";
import type { AppLocale } from "@/i18n";
import { ABOUT_PAGE_KEYWORDS, buildPublicPageMetadata } from "@/lib/seo";

interface AboutPageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({ params }: AboutPageProps): Metadata {
  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: "/about",
    title:
      params.locale === "ar"
        ? "عن كيورفي | الرعاية الطبية المنزلية في الأردن"
        : "About Curevie | Home Healthcare in Jordan",
    description:
      params.locale === "ar"
        ? "تعرف على كيورفي ونهجها في تنسيق الرعاية الطبية المنزلية ورسالتها في تقديم الخدمات الصحية داخل الأردن."
        : "Learn about Curevie's home healthcare model, care coordination approach, and mission in Jordan.",
    keywords: ABOUT_PAGE_KEYWORDS,
  });
}

export default function AboutPage() {
  return <PublicAboutExperience />;
}

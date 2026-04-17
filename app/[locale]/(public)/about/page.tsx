import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicAboutExperience } from "@/components/about/PublicAboutExperience";
import type { AppLocale } from "@/i18n";
import { ABOUT_PAGE_KEYWORDS, buildPublicPageMetadata } from "@/lib/seo";
import {
  buildAboutPageSchema,
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  getHomeSeoContent,
} from "@/lib/seo-content";
import { buildAbsoluteUrl } from "@/lib/seo";

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

export default function AboutPage({ params }: AboutPageProps) {
  const homeSeoContent = getHomeSeoContent(params.locale);

  return (
    <>
      <StructuredData
        data={[
          buildOrganizationSchema(params.locale),
          buildAboutPageSchema(params.locale),
          buildFaqSchema(homeSeoContent.faqItems),
          buildBreadcrumbSchema([
            {
              name: params.locale === "ar" ? "الرئيسية" : "Home",
              url: buildAbsoluteUrl(`/${params.locale}`),
            },
            {
              name: params.locale === "ar" ? "عن كيورفي" : "About Curevie",
              url: buildAbsoluteUrl(`/${params.locale}/about`),
            },
          ]),
        ]}
      />
      <PublicAboutExperience seoContent={homeSeoContent} />
    </>
  );
}

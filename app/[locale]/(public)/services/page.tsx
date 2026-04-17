import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicServicesHub } from "@/components/services/PublicServicesHub";
import type { AppLocale } from "@/i18n";
import {
  buildPublicPageMetadata,
  buildAbsoluteUrl,
  getServicesPageSeo,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildServicesHubSchema,
  buildServicesItemListSchema,
  getServicesHubSeoContent,
} from "@/lib/seo-content";

interface PublicServicesIndexPageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({
  params,
}: PublicServicesIndexPageProps): Metadata {
  const seo = getServicesPageSeo(params.locale);

  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: "/services",
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

export default function PublicServicesIndexPage({
  params,
}: PublicServicesIndexPageProps) {
  const content = getServicesHubSeoContent(params.locale);

  return (
    <>
      <StructuredData
        data={[
          buildOrganizationSchema(params.locale),
          buildServicesHubSchema(params.locale),
          buildServicesItemListSchema(params.locale),
          buildFaqSchema(content.faqItems),
          buildBreadcrumbSchema([
            {
              name: params.locale === "ar" ? "الرئيسية" : "Home",
              url: buildAbsoluteUrl(`/${params.locale}`),
            },
            {
              name: params.locale === "ar" ? "الخدمات" : "Services",
              url: buildAbsoluteUrl(`/${params.locale}/services`),
            },
          ]),
        ]}
      />
      <PublicServicesHub locale={params.locale} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicServiceCategoryExplorer } from "@/components/services/PublicServiceCategoryExplorer";
import type { AppLocale } from "@/i18n";
import {
  getPublicServiceCategory,
  PUBLIC_SERVICE_CATEGORIES,
  type PublicServiceCategorySlug,
} from "@/lib/public-service-categories";
import {
  buildAbsoluteUrl,
  buildPublicPageMetadata,
  getServicePageSeo,
} from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildFaqSchema,
  buildOrganizationSchema,
  buildServiceSchema,
  getServiceCategorySeoContent,
} from "@/lib/seo-content";

export const revalidate = 3600;
export const dynamic = "force-static";

interface PublicServiceCategoryPageProps {
  params: {
    locale: AppLocale;
    slug: string;
  };
}

export function generateStaticParams() {
  return PUBLIC_SERVICE_CATEGORIES.map((category) => ({ slug: category.slug }));
}

export function generateMetadata({ params }: PublicServiceCategoryPageProps): Metadata {
  const category = getPublicServiceCategory(params.slug);

  if (!category) {
    return {};
  }

  const seo = getServicePageSeo(category.slug, params.locale);

  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: `/services/${category.slug}`,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

export default function PublicServiceCategoryPage({ params }: PublicServiceCategoryPageProps) {
  const category = getPublicServiceCategory(params.slug);

  if (!category) {
    notFound();
  }

  const seoContent = getServiceCategorySeoContent(
    category.slug as PublicServiceCategorySlug,
    params.locale,
  );

  return (
    <>
      <StructuredData
        data={[
          buildOrganizationSchema(params.locale),
          buildServiceSchema(category.slug as PublicServiceCategorySlug, params.locale),
          buildFaqSchema(seoContent.faqItems),
          buildBreadcrumbSchema([
            {
              name: params.locale === "ar" ? "الرئيسية" : "Home",
              url: buildAbsoluteUrl(`/${params.locale}`),
            },
            {
              name: seoContent.shortName,
              url: buildAbsoluteUrl(`/${params.locale}/services/${category.slug}`),
            },
          ]),
        ]}
      />
      <PublicServiceCategoryExplorer slug={category.slug} />
    </>
  );
}

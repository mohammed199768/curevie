import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ServiceCatalogBuilder } from "@/components/services/ServiceCatalogBuilder";
import type { AppLocale } from "@/i18n";
import { getPublicServiceCategory } from "@/lib/public-service-categories";
import {
  getServiceCatalogTab,
  SERVICE_CATALOG_TABS,
  type ServiceCatalogSlug,
} from "@/lib/service-catalog-config";
import { buildPublicPageMetadata, getServicePageSeo } from "@/lib/seo";

export const revalidate = 3600;
export const dynamic = "force-static";

interface PublicServiceCategoryPageProps {
  params: {
    locale: AppLocale;
    slug: string;
  };
}

export function generateStaticParams() {
  return SERVICE_CATALOG_TABS.map((tab) => ({ slug: tab.slug }));
}

export function generateMetadata({ params }: PublicServiceCategoryPageProps): Metadata {
  const category = getPublicServiceCategory(params.slug);

  if (!category) {
    const tab = getServiceCatalogTab(params.slug);
    if (!tab) return {};
    return buildPublicPageMetadata({
      locale: params.locale,
      pathname: `/services/${params.slug}`,
      title: params.locale === "ar" ? tab.hero.title.ar : tab.hero.title.en,
      description: params.locale === "ar" ? tab.hero.summary.ar : tab.hero.summary.en,
    });
  }

  const seo = getServicePageSeo(category.slug);

  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: `/services/${category.slug}`,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

export default function PublicServiceCategoryPage({ params }: PublicServiceCategoryPageProps) {
  if (!getServiceCatalogTab(params.slug)) {
    notFound();
  }

  return (
    <ServiceCatalogBuilder
      initialSlug={params.slug as ServiceCatalogSlug}
      locale={params.locale}
    />
  );
}

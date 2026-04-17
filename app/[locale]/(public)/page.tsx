import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicHomeExperience } from "@/components/home/PublicHomeExperience";
import type { AppLocale } from "@/i18n";
import { buildPublicPageMetadata, getDefaultSiteSeo } from "@/lib/seo";
import {
  buildFaqSchema,
  buildOrganizationSchema,
  buildWebSiteSchema,
  getHomeSeoContent,
} from "@/lib/seo-content";

export const revalidate = 300;

interface HomePageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({ params }: HomePageProps): Metadata {
  const seo = getDefaultSiteSeo(params.locale);

  return buildPublicPageMetadata({
    locale: params.locale,
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords,
  });
}

export default function HomePage({ params }: HomePageProps) {
  const homeSeoContent = getHomeSeoContent(params.locale);

  return (
    <>
      <StructuredData
        data={[
          buildOrganizationSchema(params.locale),
          buildWebSiteSchema(params.locale),
          buildFaqSchema(homeSeoContent.faqItems),
        ]}
      />
      <PublicHomeExperience seoContent={homeSeoContent} />
    </>
  );
}

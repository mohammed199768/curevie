import type { Metadata } from "next";
import { PublicHomeExperience } from "@/components/home/PublicHomeExperience";
import type { AppLocale } from "@/i18n";
import { buildPublicPageMetadata, getDefaultSiteSeo } from "@/lib/seo";

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

export default function HomePage() {
  return <PublicHomeExperience />;
}

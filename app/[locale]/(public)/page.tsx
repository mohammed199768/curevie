import type { Metadata } from "next";
import { PublicHomeExperience } from "@/components/home/PublicHomeExperience";
import type { AppLocale } from "@/i18n";
import {
  BASE_SEO_KEYWORDS,
  buildPublicPageMetadata,
  DEFAULT_SITE_DESCRIPTION,
  DEFAULT_SITE_TITLE,
} from "@/lib/seo";

export const revalidate = 300;

interface HomePageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({ params }: HomePageProps): Metadata {
  return buildPublicPageMetadata({
    locale: params.locale,
    title: DEFAULT_SITE_TITLE,
    description: DEFAULT_SITE_DESCRIPTION,
    keywords: BASE_SEO_KEYWORDS,
  });
}

export default function HomePage() {
  return <PublicHomeExperience />;
}

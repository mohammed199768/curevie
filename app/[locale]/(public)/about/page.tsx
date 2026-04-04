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
    title: "About Curevie | عن كيورفي",
    description: "Learn about Curevie's home healthcare model, care coordination approach, and mission in Jordan.",
    keywords: ABOUT_PAGE_KEYWORDS,
  });
}

export default function AboutPage() {
  return <PublicAboutExperience />;
}

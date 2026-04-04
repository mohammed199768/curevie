import type { Metadata } from "next";
import { PublicContactExperience } from "@/components/contact/PublicContactExperience";
import type { AppLocale } from "@/i18n";
import { buildPublicPageMetadata, CONTACT_PAGE_KEYWORDS } from "@/lib/seo";

interface ContactPageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({ params }: ContactPageProps): Metadata {
  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: "/contact",
    title: "Contact Curevie | تواصل مع كيورفي",
    description: "Contact Curevie for home healthcare support, medical service guidance, and request follow-up in Jordan.",
    keywords: CONTACT_PAGE_KEYWORDS,
  });
}

export default function ContactPage() {
  return <PublicContactExperience />;
}

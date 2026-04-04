import type { Metadata } from "next";
import { PrivacyPolicyExperience } from "@/components/legal/PrivacyPolicyExperience";
import type { AppLocale } from "@/i18n";
import { BASE_SEO_KEYWORDS, buildPublicPageMetadata } from "@/lib/seo";

interface PrivacyPolicyPageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({ params }: PrivacyPolicyPageProps): Metadata {
  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: "/privacy",
    title: "Privacy Policy | سياسة الخصوصية | Curevie",
    description: "Read Curevie's privacy policy, data handling terms, and patient information commitments for home healthcare services in Jordan.",
    keywords: [...BASE_SEO_KEYWORDS, "privacy policy", "سياسة الخصوصية", "curevie privacy"],
  });
}

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyExperience />;
}

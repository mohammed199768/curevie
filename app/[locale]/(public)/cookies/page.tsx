import type { Metadata } from "next";
import { CookiePolicyExperience } from "@/components/legal/CookiePolicyExperience";
import type { AppLocale } from "@/i18n";
import { BASE_SEO_KEYWORDS, buildPublicPageMetadata } from "@/lib/seo";

interface CookiePolicyPageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({ params }: CookiePolicyPageProps): Metadata {
  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: "/cookies",
    title: "Cookie Policy | سياسة ملفات الارتباط | Curevie",
    description: "Review how Curevie uses cookies and consent preferences across the patient home healthcare experience.",
    keywords: [...BASE_SEO_KEYWORDS, "cookie policy", "سياسة ملفات الارتباط", "curevie cookies"],
  });
}

export default function CookiePolicyPage() {
  return <CookiePolicyExperience />;
}

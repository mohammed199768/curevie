import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/StructuredData";
import { PublicContactExperience } from "@/components/contact/PublicContactExperience";
import type { AppLocale } from "@/i18n";
import { buildPublicPageMetadata, CONTACT_PAGE_KEYWORDS } from "@/lib/seo";
import {
  buildBreadcrumbSchema,
  buildContactPageSchema,
  buildLocationMapSchema,
  buildOrganizationSchema,
} from "@/lib/seo-content";
import { buildAbsoluteUrl } from "@/lib/seo";

interface ContactPageProps {
  params: {
    locale: AppLocale;
  };
}

export function generateMetadata({ params }: ContactPageProps): Metadata {
  return buildPublicPageMetadata({
    locale: params.locale,
    pathname: "/contact",
    title:
      params.locale === "ar"
        ? "تواصل مع كيورفي | خدمات الرعاية المنزلية"
        : "Contact Curevie | Home Healthcare Support",
    description:
      params.locale === "ar"
        ? "تواصل مع كيورفي للحصول على دعم خدمات الرعاية الطبية المنزلية والإرشاد الطبي ومتابعة الطلبات في الأردن."
        : "Contact Curevie for home healthcare support, medical service guidance, and request follow-up in Jordan.",
    keywords: CONTACT_PAGE_KEYWORDS,
  });
}

export default function ContactPage({ params }: ContactPageProps) {
  return (
    <>
      <StructuredData
        data={[
          buildOrganizationSchema(params.locale),
          buildContactPageSchema(params.locale),
          buildLocationMapSchema(),
          buildBreadcrumbSchema([
            {
              name: params.locale === "ar" ? "الرئيسية" : "Home",
              url: buildAbsoluteUrl(`/${params.locale}`),
            },
            {
              name: params.locale === "ar" ? "تواصل مع كيورفي" : "Contact Curevie",
              url: buildAbsoluteUrl(`/${params.locale}/contact`),
            },
          ]),
        ]}
      />
      <PublicContactExperience />
    </>
  );
}

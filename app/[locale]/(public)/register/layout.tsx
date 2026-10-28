import type { Metadata } from "next";
import type { ReactNode } from "react";
import type { AppLocale } from "@/i18n";
import { buildAbsoluteUrl, NOINDEX_ROBOTS } from "@/lib/seo";

export function generateMetadata({ params }: { params: { locale: AppLocale } }): Metadata {
  return {
    title: params.locale === "ar" ? "إنشاء حساب | كيورفي" : "Create account | Curevie",
    alternates: { canonical: buildAbsoluteUrl(`/${params.locale}/register`) },
    robots: NOINDEX_ROBOTS,
  };
}

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}

import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppProviders } from "@/components/providers/AppProviders";
import { locales } from "@/i18n";
import { cairo, cormorantGaramond, inter } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Curevie Patient Portal",
  description: "Curevie medical home-services platform for patients",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface LocaleLayoutProps {
  children: ReactNode;
  params: {
    locale: string;
  };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = params;

  if (!hasLocale(locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = (await import(`@/messages/${locale}.json`)).default;

  return (
    <div
      data-locale-root
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      className={`${cairo.variable} ${inter.variable} ${cormorantGaramond.variable} min-h-screen`}
    >
      <NextIntlClientProvider locale={locale} messages={messages}>
        <AppProviders>{children}</AppProviders>
      </NextIntlClientProvider>
    </div>
  );
}


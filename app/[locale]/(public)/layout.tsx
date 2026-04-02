"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { ConsentBanner } from "@/components/analytics/ConsentBanner";
import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { getConsent, hasDecided, initPixel, onPublicPageView, type ConsentState } from "@/lib/analytics";

export default function PublicLayout({ children }: { children: ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const lastTrackedPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      return;
    }

    const consent = getConsent();
    if (!consent.decided || !consent.marketing) {
      return;
    }

    initPixel(process.env.NEXT_PUBLIC_META_PIXEL_ID || "");
  }, []);

  useEffect(() => {
    if (!pathname || !hasDecided()) {
      return;
    }

    const consent = getConsent();
    if (!consent.analytics && !consent.marketing) {
      return;
    }

    if (lastTrackedPathnameRef.current === pathname) {
      return;
    }

    onPublicPageView({ pathname, locale });
    lastTrackedPathnameRef.current = pathname;
  }, [locale, pathname]);

  const handleConsentAccepted = (state: ConsentState) => {
    if (!pathname) {
      return;
    }

    if (state.marketing && process.env.NODE_ENV === "production") {
      initPixel(process.env.NEXT_PUBLIC_META_PIXEL_ID || "");
    }

    if (!state.analytics && !state.marketing) {
      return;
    }

    if (lastTrackedPathnameRef.current === pathname) {
      return;
    }

    onPublicPageView({ pathname, locale });
    lastTrackedPathnameRef.current = pathname;
  };

  const isAuthPage = pathname?.endsWith("/login") || pathname?.endsWith("/register");

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-background md:pb-0">
      <Navbar />
      <main>{children}</main>
      {!isAuthPage && <Footer locale={locale} />}
      <ConsentBanner onConsentAccepted={handleConsentAccepted} />
    </div>
  );
}


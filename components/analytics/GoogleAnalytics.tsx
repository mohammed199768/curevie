"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CONSENT_UPDATED_EVENT,
  getConsent,
  isAnalyticsAllowed,
  type ConsentState,
} from "@/lib/analytics";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type GoogleAnalyticsProps = {
  measurementId: string;
};

function trackPageView(measurementId: string, pathname: string, searchParams: URLSearchParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const queryString = searchParams.toString();
  const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

  window.gtag("config", measurementId, {
    page_path: pagePath,
    page_location: window.location.href,
  });
}

export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [consent, setConsent] = useState<ConsentState>(() => getConsent());
  const [isInitialized, setIsInitialized] = useState(false);

  const analyticsEnabled = useMemo(
    () => consent.decided && isAnalyticsAllowed(),
    [consent],
  );

  useEffect(() => {
    const syncConsent = () => {
      setConsent(getConsent());
    };

    syncConsent();
    window.addEventListener(CONSENT_UPDATED_EVENT, syncConsent);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    if (!analyticsEnabled || !pathname || !searchParams || !isInitialized) {
      return;
    }

    trackPageView(measurementId, pathname, searchParams);
  }, [analyticsEnabled, isInitialized, measurementId, pathname, searchParams]);

  if (!measurementId || !analyticsEnabled) {
    return null;
  }

  return (
    <>
      <Script
        id="google-analytics-src"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="afterInteractive"
      />
      <Script
        id="google-analytics-init"
        strategy="afterInteractive"
        onReady={() => setIsInitialized(true)}
      >
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            send_page_view: false
          });
        `}
      </Script>
    </>
  );
}

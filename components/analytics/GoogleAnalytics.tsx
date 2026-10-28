"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { redactTrackingToken, TRACKING_TOKEN_PATTERN_SOURCE } from "@/lib/analytics/redact";
import { CONSENT_UPDATED_EVENT, isAnalyticsAllowed } from "@/lib/analytics/consent";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
    [gaDisableFlag: `ga-disable-${string}`]: boolean | undefined;
  }
}

type GoogleAnalyticsProps = {
  measurementId?: string;
};

function trackPageView(measurementId: string, pathname: string, searchParams: URLSearchParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const queryString = searchParams.toString();
  const pagePath = queryString ? `${pathname}?${queryString}` : pathname;

  window.gtag("config", measurementId, {
    page_path: redactTrackingToken(pagePath),
    page_location: redactTrackingToken(window.location.href),
  });
}

/**
 * Loads Google Analytics only after the visitor accepted analytics cookies, and stops
 * collection again if that consent is withdrawn.
 */
export function GoogleAnalytics({ measurementId }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isInitialized, setIsInitialized] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);

  useEffect(() => {
    const syncConsent = () => setAnalyticsAllowed(isAnalyticsAllowed());
    syncConsent();
    window.addEventListener(CONSENT_UPDATED_EVENT, syncConsent);
    return () => window.removeEventListener(CONSENT_UPDATED_EVENT, syncConsent);
  }, []);

  useEffect(() => {
    if (!measurementId) return;
    // gtag honours this flag: once consent is withdrawn no further hits are sent.
    window[`ga-disable-${measurementId}`] = !analyticsAllowed;
  }, [analyticsAllowed, measurementId]);

  useEffect(() => {
    if (!measurementId || !analyticsAllowed || !pathname || !searchParams || !isInitialized) {
      return;
    }

    trackPageView(measurementId, pathname, searchParams);
  }, [analyticsAllowed, isInitialized, measurementId, pathname, searchParams]);

  if (!measurementId || !analyticsAllowed) {
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
            page_location: window.location.href.replace(new RegExp('${TRACKING_TOKEN_PATTERN_SOURCE}', 'gi'), '$1track$2redacted'),
            page_path: window.location.pathname.replace(new RegExp('${TRACKING_TOKEN_PATTERN_SOURCE}', 'gi'), '$1track$2redacted'),
          });
        `}
      </Script>
    </>
  );
}

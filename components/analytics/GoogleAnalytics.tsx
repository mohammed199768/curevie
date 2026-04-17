"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

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
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!measurementId || !pathname || !searchParams || !isInitialized) {
      return;
    }

    trackPageView(measurementId, pathname, searchParams);
  }, [isInitialized, measurementId, pathname, searchParams]);

  if (!measurementId) {
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
          gtag('config', '${measurementId}');
        `}
      </Script>
    </>
  );
}

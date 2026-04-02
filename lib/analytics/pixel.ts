import { isMarketingAllowed } from "./consent";

type PixelArgs = [method: string, eventName?: string, params?: Record<string, unknown>];

type PixelFunction = ((...args: PixelArgs) => void) & {
  callMethod?: (...args: PixelArgs) => void;
  queue?: PixelArgs[];
  loaded?: boolean;
  version?: string;
  push?: (...args: PixelArgs) => number;
};

declare global {
  interface Window {
    fbq?: PixelFunction;
    _fbq?: PixelFunction;
  }
}

function isPixelRuntimeAllowed() {
  return typeof window !== "undefined" && process.env.NODE_ENV === "production" && isMarketingAllowed();
}

function getPixelFunction() {
  if (!isPixelRuntimeAllowed()) {
    return null;
  }

  const fbq = window.fbq;
  if (typeof fbq === "undefined") {
    return null;
  }

  return fbq;
}

function trackPixelEvent(eventName: string, params?: Record<string, unknown>) {
  const fbq = getPixelFunction();
  if (!fbq || typeof fbq === "undefined") {
    return;
  }

  if (params && Object.keys(params).length > 0) {
    fbq("track", eventName, params);
    return;
  }

  fbq("track", eventName);
}

export function initPixel(pixelId: string): void {
  if (!pixelId || !isPixelRuntimeAllowed() || typeof document === "undefined") {
    return;
  }

  if (typeof window.fbq !== "undefined") {
    return;
  }

  const fbq = function (...args: PixelArgs) {
    if (typeof fbq.callMethod === "function") {
      fbq.callMethod(...args);
      return;
    }

    fbq.queue?.push(args);
  } as PixelFunction;

  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  fbq.push = (...args: PixelArgs) => fbq.queue?.push(args) ?? 0;

  window.fbq = fbq;
  window._fbq = fbq;

  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";

  const firstScript = document.getElementsByTagName("script")[0];
  if (firstScript?.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }

  const initializedFbq = window.fbq;
  if (typeof initializedFbq === "undefined") {
    return;
  }

  initializedFbq("init", pixelId);
}

export function trackPageView(): void {
  trackPixelEvent("PageView");
}

export function trackViewContent(params: {
  content_name: string;
  content_category: string;
}): void {
  trackPixelEvent("ViewContent", params);
}

export function trackContact(): void {
  trackPixelEvent("Contact");
}

export function trackLead(params: {
  content_name?: string;
  content_category?: string;
}): void {
  trackPixelEvent("Lead", params);
}

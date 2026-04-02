import type { AnalyticsServiceKind } from "@/lib/public-service-categories";
import type { AnalyticsEventPayload, AnalyticsEventType } from "@/lib/api/analytics";
import { isAnalyticsAllowed } from "./consent";

const ANALYTICS_ENDPOINT = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"}/analytics/events`;

// Phase 1: first-party events were logged to console only.
// Phase 2: consented public events fire in both dev and production,
//   and are sent to the backend ingestion layer for storage in analytics_events.
// Phase 3: build the admin analytics page reading from that table
//   for page views, service interest, funnel, and UTM summaries.
// Meta Pixel alone cannot populate the admin dashboard.
// Exact conversions for admin must come from backend service_requests.
// Meta Graph API is future optional work.

function logFirstPartyEvent(eventName: AnalyticsEventType, params: Record<string, string>) {
  if (!isAnalyticsAllowed()) {
    return;
  }

  console.log("[analytics:first-party]", eventName, params);
}

function readBrowserMetadata() {
  if (typeof window === "undefined") {
    return {
      referrer: undefined,
      utm_source: undefined,
      utm_medium: undefined,
      utm_campaign: undefined,
    };
  }

  const searchParams = new URLSearchParams(window.location.search);

  return {
    referrer: document.referrer || undefined,
    utm_source: searchParams.get("utm_source") || undefined,
    utm_medium: searchParams.get("utm_medium") || undefined,
    utm_campaign: searchParams.get("utm_campaign") || undefined,
  };
}

function sendFirstPartyEvent(
  event_type: AnalyticsEventType,
  params: Omit<AnalyticsEventPayload, "event_type">,
) {
  if (!isAnalyticsAllowed()) {
    return;
  }

  const payload: AnalyticsEventPayload = {
    ...params,
    event_type,
    ...readBrowserMetadata(),
  };

  logFirstPartyEvent(event_type, Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Record<string, string>);

  try {
    void fetch(ANALYTICS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Swallow synchronous client errors to keep analytics non-blocking.
  }
}

export function trackPublicPageView(params: { pathname: string; locale: string }): void {
  sendFirstPartyEvent("public_page_view", params);
}

export function trackServiceCategoryView(params: {
  service_slug: string;
  service_kind: AnalyticsServiceKind;
  locale: string;
}): void {
  sendFirstPartyEvent("service_category_view", params);
}

export function trackContactChannelClick(params: { channel: string; locale: string }): void {
  sendFirstPartyEvent("contact_channel_click", params);
}

export function trackGuestRequestDialogOpen(params: { service_slug: string; locale: string }): void {
  sendFirstPartyEvent("guest_request_dialog_open", params);
}

export function trackRequestCreated(params: {
  service_slug: string;
  service_kind: AnalyticsServiceKind;
  locale: string;
}): void {
  sendFirstPartyEvent("request_created", params);
}

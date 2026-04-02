import { publicApiClient } from "./client";
import type { AnalyticsServiceKind } from "@/lib/public-service-categories";

export type AnalyticsEventType =
  | "public_page_view"
  | "service_category_view"
  | "contact_channel_click"
  | "guest_request_dialog_open"
  | "request_created";

export type AnalyticsEventPayload = {
  event_type: AnalyticsEventType;
  pathname?: string;
  locale: string;
  service_slug?: string;
  service_kind?: AnalyticsServiceKind;
  channel?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

export type AnalyticsEventResponse = {
  id: string;
  event_type: AnalyticsEventType;
  created_at: string;
};

export const analyticsApi = {
  ingestEvent: (payload: AnalyticsEventPayload) =>
    publicApiClient.post<AnalyticsEventResponse>("/analytics/events", payload),
};

import type { AnalyticsServiceKind } from "@/lib/public-service-categories";
import {
  trackContactChannelClick,
  trackGuestRequestDialogOpen,
  trackPublicPageView,
  trackRequestCreated,
  trackServiceCategoryView,
} from "./firstParty";
import { trackContact, trackLead, trackPageView, trackViewContent } from "./pixel";

export function onPublicPageView(params: { pathname: string; locale: string }): void {
  trackPublicPageView(params);
  trackPageView();
}

export function onServiceCategoryView(params: {
  service_slug: string;
  service_kind: AnalyticsServiceKind;
  locale: string;
}): void {
  trackServiceCategoryView(params);
  trackViewContent({
    content_name: params.service_slug,
    content_category: params.service_kind,
  });
}

export function onContactChannelClick(params: { channel: string; locale: string }): void {
  trackContactChannelClick(params);
  trackContact();
}

export function onGuestRequestDialogOpen(params: { service_slug: string; locale: string }): void {
  trackGuestRequestDialogOpen(params);
}

export function onRequestCreated(params: {
  service_slug: string;
  service_kind: AnalyticsServiceKind;
  locale: string;
}): void {
  trackRequestCreated(params);
  trackLead({
    content_name: params.service_slug,
    content_category: params.service_kind,
  });
}

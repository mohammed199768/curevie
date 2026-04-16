import type { NotificationItem } from "@/lib/api/types";

function readString(
  data: Record<string, unknown> | null | undefined,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = data?.[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return null;
}

export function getNotificationCaseOrRequestId(notification: NotificationItem) {
  return readString(
    notification.data,
    "case_id",
    "caseId",
    "request_id",
    "requestId"
  );
}

export function getPatientNotificationHref(
  notification: NotificationItem,
  locale: string
) {
  const recordId = getNotificationCaseOrRequestId(notification);
  return recordId ? `/${locale}/requests/${recordId}` : null;
}

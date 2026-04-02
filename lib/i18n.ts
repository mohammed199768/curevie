type TranslationFn = ((key: string, values?: Record<string, any>) => string) & {
  has?: (key: string) => boolean;
};

type NotificationLike = {
  type?: string | null;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
};

export function normalizeEnumKey(value?: string | null) {
  return String(value || "UNKNOWN").trim().toUpperCase();
}

export function humanizeEnumValue(value?: string | null) {
  const normalized = normalizeEnumKey(value);
  return normalized
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

export function translateEnumValue(value: string | null | undefined, t: TranslationFn) {
  const normalized = normalizeEnumKey(value);
  if (typeof t.has === "function" && t.has(normalized)) {
    return t(normalized);
  }
  return humanizeEnumValue(normalized);
}

export function translateNotificationContent(
  notification: NotificationLike,
  t: TranslationFn,
  tEnums: TranslationFn,
) {
  const type = normalizeEnumKey(notification.type);
  const data = notification.data || {};

  if (!t.has?.(`content.${type}.title`)) {
    return {
      title: notification.title || humanizeEnumValue(type),
      body: notification.body || "",
    };
  }

  const values = {
    service: translateEnumValue(
      typeof data.serviceType === "string" ? data.serviceType : typeof data.service_type === "string" ? data.service_type : null,
      tEnums,
    ),
    amount: data.amount ?? "",
    remaining: data.remaining ?? "",
    discount: data.discount ?? "",
    points: data.points ?? "",
    totalPoints: data.totalPoints ?? data.total_points ?? "",
  };

  return {
    title: t(`content.${type}.title`, values),
    body: t(`content.${type}.body`, values),
  };
}

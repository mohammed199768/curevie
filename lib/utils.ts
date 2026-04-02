import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ApiListResponse, ApiPagination } from "@/lib/api/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function extractApiData<T>(payload: unknown): T {
  if (payload === null || payload === undefined) {
    throw new Error("API returned empty payload");
  }

  return payload as T;
}

export function normalizePagination(pagination?: Partial<ApiPagination>): ApiPagination {
  return {
    page: Number(pagination?.page ?? 1),
    limit: Number(pagination?.limit ?? 20),
    total: Number(pagination?.total ?? 0),
    total_pages: Number(pagination?.total_pages ?? pagination?.pages ?? 1),
    pages: Number(pagination?.pages ?? pagination?.total_pages ?? 1),
  };
}

export function normalizeListResponse<T>(payload: ApiListResponse<T>): ApiListResponse<T>;
export function normalizeListResponse<T>(payload: { data: ApiListResponse<T> }): ApiListResponse<T>;
export function normalizeListResponse<T>(payload: unknown): ApiListResponse<T> {
  const fallback: ApiListResponse<T> = {
    data: [],
    pagination: normalizePagination({ page: 1, limit: 20, total: 0, total_pages: 1 }),
  };

  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const normalizedPayload =
    Array.isArray((payload as { data?: unknown }).data)
      ? payload
      : ((payload as { data?: unknown }).data && typeof (payload as { data?: unknown }).data === "object")
        ? (payload as { data: unknown }).data
        : null;

  if (!normalizedPayload || typeof normalizedPayload !== "object") {
    return fallback;
  }

  const data = Array.isArray((normalizedPayload as { data?: unknown[] }).data)
    ? ((normalizedPayload as { data: T[] }).data ?? [])
    : [];

  const pagination = normalizePagination(
    (normalizedPayload as { pagination?: ApiPagination }).pagination,
  );

  return { data, pagination };
}

function resolveLocale(locale?: string): string {
  if (locale) return locale;
  if (typeof document !== "undefined" && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  if (typeof window !== "undefined") {
    const maybeLocale = window.location.pathname.split("/").filter(Boolean)[0];
    if (maybeLocale) return maybeLocale;
  }
  return "en";
}

function toDate(value?: string | number | Date | null): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getPartValue(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes): string {
  return parts.find((part) => part.type === type)?.value || "";
}

function getDateParts(date: Date, locale?: string): { day: string; month: string; year: string } {
  const formatter = new Intl.DateTimeFormat(resolveLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const parts = formatter.formatToParts(date);
  return {
    day: getPartValue(parts, "day"),
    month: getPartValue(parts, "month"),
    year: getPartValue(parts, "year"),
  };
}

function getWeekdayPart(date: Date, locale?: string): string {
  const formatter = new Intl.DateTimeFormat(resolveLocale(locale), {
    weekday: "long",
  });
  const parts = formatter.formatToParts(date);
  return getPartValue(parts, "weekday");
}

function getTimeParts(date: Date, locale?: string): { hour: string; minute: string } {
  const formatter = new Intl.DateTimeFormat(resolveLocale(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return {
    hour: getPartValue(parts, "hour"),
    minute: getPartValue(parts, "minute"),
  };
}

export function formatDateOnly(value?: string | number | Date | null, _pattern = "dd/MM/yyyy", locale?: string): string {
  void _pattern;
  const date = toDate(value);
  if (!date) return "-";
  const { day, month, year } = getDateParts(date, locale);
  return `${day}/${month}/${year}`;
}

export function formatDateShort(value?: string | number | Date | null, locale?: string): string {
  const date = toDate(value);
  if (!date) return "-";
  const { day, month } = getDateParts(date, locale);
  return `${day}/${month}`;
}

export function formatDateTime(value?: string | number | Date | null, _pattern = "dd/MM/yyyy, HH:mm", locale?: string): string {
  void _pattern;
  const date = toDate(value);
  if (!date) return "-";
  return `${formatDateOnly(date, "dd/MM/yyyy", locale)} ${formatTimeOnly(date, locale)}`;
}

export function formatTimeOnly(value?: string | number | Date | null, locale?: string): string {
  const date = toDate(value);
  if (!date) return "-";
  const { hour, minute } = getTimeParts(date, locale);
  return `${hour}:${minute}`;
}

export function formatDateWithWeekday(value?: string | number | Date | null, locale?: string): string {
  const date = toDate(value);
  if (!date) return "-";
  const weekday = getWeekdayPart(date, locale);
  return `${weekday}, ${formatDateOnly(date, "dd/MM/yyyy", locale)}`;
}

export function formatRelativeTime(value?: string | number | Date | null, locale?: string): string {
  const date = toDate(value);
  if (!date) return "-";

  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);
  const rtf = new Intl.RelativeTimeFormat(resolveLocale(locale), { numeric: "auto" });

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;

  if (absMs >= year) return rtf.format(Math.round(diffMs / year), "year");
  if (absMs >= month) return rtf.format(Math.round(diffMs / month), "month");
  if (absMs >= week) return rtf.format(Math.round(diffMs / week), "week");
  if (absMs >= day) return rtf.format(Math.round(diffMs / day), "day");
  if (absMs >= hour) return rtf.format(Math.round(diffMs / hour), "hour");
  if (absMs >= minute) return rtf.format(Math.round(diffMs / minute), "minute");
  return rtf.format(Math.round(diffMs / 1000), "second");
}

export function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

export function triggerBlobDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function localePath(pathname: string, locale: string): string {
  if (pathname === "/") return `/${locale}`;
  const segments = pathname.split("/").filter(Boolean);
  if (!segments.length) return `/${locale}`;
  segments[0] = locale;
  return `/${segments.join("/")}`;
}


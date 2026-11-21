import type { CaseItemType } from "@/lib/api/cases";
import { packagesApi } from "@/lib/api/packages";
import { servicesApi } from "@/lib/api/services";
import type { ApiListResponse, MoneyValue, ServiceItem, ServiceKind } from "@/lib/api/types";
import type { LabTestEntry } from "@/lib/lab-catalog";
import { orderItemKey } from "@/lib/order-items";
import { normalizeListResponse } from "@/lib/utils";

/** One orderable catalog entry, normalised across services and packages. */
export interface OrderCatalogItem {
  key: string;
  type: CaseItemType;
  id: string;
  name: string;
  description: string | null;
  /** Catalog list price (display only; the server computes what is charged). */
  price: number | null;
  serviceKind: ServiceKind | null;
  groupName: string | null;
  vipOnly: boolean;
  /** Packages only: names of the included services. */
  includedServices: string[];
  /** Packages only: what the bundle saves compared to ordering its services one by one. */
  savings: number | null;
  /** Lab tests only: the patient must fast before the sample is taken. */
  requiresFasting?: boolean;
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

/**
 * Service kinds whose whole list is small enough to load for the order page. Lab tests are not here on
 * purpose: there are hundreds, so they are browsed a page at a time (components/lab/LabTestBrowser).
 */
export const PRELOADED_SERVICE_KINDS: readonly ServiceKind[] = ["MEDICAL", "NURSING", "RADIOLOGY"];

function toPrice(value: MoneyValue | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

function localized(locale: string, ar?: string | null, en?: string | null, fallback?: string | null) {
  return (locale.startsWith("ar") ? ar || en : en || ar) || fallback || "";
}

async function fetchAllPages<T>(load: (page: number) => Promise<{ data: ApiListResponse<T> }>) {
  const first = normalizeListResponse<T>((await load(1)).data);
  const totalPages = Math.min(
    Number(first.pagination.total_pages || first.pagination.pages || 1),
    MAX_PAGES,
  );

  if (totalPages <= 1) return first.data;

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, async (_, index) => normalizeListResponse<T>((await load(index + 2)).data).data),
  );

  return [...first.data, ...rest.flat()];
}

function build(type: CaseItemType, item: Omit<OrderCatalogItem, "key" | "type">): OrderCatalogItem {
  return { ...item, type, key: orderItemKey({ type, id: item.id }) };
}

function serviceToCatalogItem(row: ServiceItem, locale: string): OrderCatalogItem {
  const isLab = row.service_kind === "LAB";
  return build("SERVICE", {
    id: row.id,
    name: localized(locale, row.name_ar, row.name_en, row.name),
    description: localized(locale, row.description_ar, row.description_en, row.description) || null,
    price: toPrice(row.price),
    serviceKind: row.service_kind || "MEDICAL",
    // Lab groups carry a slug in category_name; their readable names are the localised ones.
    groupName: (isLab ? localized(locale, row.category_name_ar, row.category_name_en) : row.category_name) || null,
    vipOnly: Boolean(row.is_vip_exclusive),
    includedServices: [],
    savings: null,
    requiresFasting: Boolean(row.requires_fasting),
  });
}

/** A lab test picked in the lab browser, in the shape the order page works with. */
export function labEntryToCatalogItem(entry: LabTestEntry): OrderCatalogItem {
  return build("SERVICE", {
    id: entry.id,
    name: entry.name,
    description: entry.description,
    price: entry.price,
    serviceKind: "LAB",
    groupName: entry.categoryName,
    vipOnly: false,
    includedServices: [],
    savings: null,
    requiresFasting: entry.requiresFasting,
  });
}

/**
 * One service by id (e.g. a lab test that arrived through ?items= or "order again").
 * null when it no longer exists or is not orderable (404).
 */
export async function fetchOrderCatalogService(id: string, locale: string): Promise<OrderCatalogItem | null> {
  try {
    const { data } = await servicesApi.getPublic(id);
    return data?.id ? serviceToCatalogItem(data, locale) : null;
  } catch (error) {
    if ((error as { response?: { status?: number } })?.response?.status === 404) return null;
    throw error;
  }
}

export async function fetchOrderCatalog(type: CaseItemType, locale: string): Promise<OrderCatalogItem[]> {
  switch (type) {
    case "SERVICE": {
      const lists = await Promise.all(
        PRELOADED_SERVICE_KINDS.map((kind) =>
          fetchAllPages((page) => servicesApi.list({ page, limit: PAGE_LIMIT, service_kind: kind })),
        ),
      );
      return lists.flat().map((row) => serviceToCatalogItem(row, locale));
    }
    case "PACKAGE": {
      const rows = await fetchAllPages((page) => packagesApi.list({ page, limit: PAGE_LIMIT }));
      return rows.map((row) => {
        const savings = toPrice(row.savings);
        return build("PACKAGE", {
          id: row.id,
          name: localized(locale, row.name_ar, row.name_en, row.name),
          description: localized(locale, row.description_ar, row.description_en, row.description) || null,
          price: toPrice(row.total_cost),
          serviceKind: null,
          groupName: row.category_name || null,
          vipOnly: Boolean(row.is_vip_exclusive),
          includedServices: (row.services || []).map((service) => localized(locale, service.name_ar, service.name_en, service.name)),
          savings: savings !== null && savings > 0 ? savings : null,
        });
      });
    }
    default:
      return [];
  }
}

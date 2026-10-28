import type { CaseItemType } from "@/lib/api/cases";
import { packagesApi } from "@/lib/api/packages";
import { servicesApi } from "@/lib/api/services";
import type { ApiListResponse, MoneyValue, ServiceKind } from "@/lib/api/types";
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
}

const PAGE_LIMIT = 100;
const MAX_PAGES = 10;

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

export async function fetchOrderCatalog(type: CaseItemType, locale: string): Promise<OrderCatalogItem[]> {
  switch (type) {
    case "SERVICE": {
      const rows = await fetchAllPages((page) => servicesApi.list({ page, limit: PAGE_LIMIT }));
      return rows.map((row) => build("SERVICE", {
        id: row.id,
        name: localized(locale, row.name_ar, row.name_en, row.name),
        description: localized(locale, row.description_ar, row.description_en, row.description) || null,
        price: toPrice(row.price),
        serviceKind: row.service_kind || "MEDICAL",
        groupName: row.category_name || null,
        vipOnly: Boolean(row.is_vip_exclusive),
        includedServices: [],
        savings: null,
      }));
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

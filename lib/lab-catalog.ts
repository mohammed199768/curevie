import { publicApiClient } from "@/lib/api/client";
import { servicesApi } from "@/lib/api/services";
import type { ApiListResponse, MoneyValue, ServiceCategory, ServiceItem } from "@/lib/api/types";
import type { PublicCatalogEntry } from "@/lib/public-service-categories";
import { normalizeListResponse } from "@/lib/utils";

/**
 * Lab tests are browsed as a tree (most requested → groups → tests) and always fetched one small page
 * at a time: the catalog has hundreds of tests, so nothing here ever loads a whole group or the whole list.
 */
export const LAB_TESTS_PAGE_SIZE = 10;
/** There are fewer than 20 lab groups; one page of 20 covers each of the two lists (regular / specialised). */
export const LAB_GROUPS_PAGE_SIZE = 20;
export const LAB_SEARCH_DEBOUNCE_MS = 350;
export const LAB_SEARCH_MIN_LENGTH = 2;

export type LabTestEntry = Extract<PublicCatalogEntry, { type: "service" }> & { requiresFasting: boolean };

export interface LabGroup {
  id: string;
  name: string;
  description: string | null;
  activeCount: number;
  specialized: boolean;
}

export interface LabTestsPage {
  entries: LabTestEntry[];
  page: number;
  total: number;
  hasNext: boolean;
}

function localized(locale: string, ar?: string | null, en?: string | null, fallback?: string | null) {
  return (locale.startsWith("ar") ? ar || en : en || ar) || fallback || "";
}

function toPrice(value: MoneyValue | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const price = Number(value);
  return Number.isFinite(price) ? price : null;
}

export function mapLabTest(item: ServiceItem, locale: string): LabTestEntry {
  return {
    id: item.id,
    type: "service",
    name: localized(locale, item.name_ar, item.name_en, item.name),
    description: localized(locale, item.description_ar, item.description_en, item.description) || null,
    // For lab groups category_name holds the group slug; the readable names are the localised ones.
    categoryName: localized(locale, item.category_name_ar, item.category_name_en) || null,
    price: toPrice(item.price),
    serviceKind: "LAB",
    requiresFasting: Boolean(item.requires_fasting),
  };
}

export function mapLabGroup(group: ServiceCategory, locale: string): LabGroup {
  return {
    id: group.id,
    name: localized(locale, group.name_ar, group.name_en, group.name),
    description: localized(locale, group.description_ar, group.description_en) || null,
    activeCount: Number(group.active_count || 0),
    specialized: Boolean(group.is_specialized),
  };
}

/** Lab groups in the admin's order; empty groups are left out. */
export async function fetchLabGroups(specialized: boolean, locale: string): Promise<LabGroup[]> {
  const response = await servicesApi.listCategoriesPublic({
    service_kind: "LAB",
    is_specialized: specialized,
    page: 1,
    limit: LAB_GROUPS_PAGE_SIZE,
  });
  return normalizeListResponse<ServiceCategory>(response.data)
    .data.map((group) => mapLabGroup(group, locale))
    .filter((group) => group.activeCount > 0);
}

export interface LabTestsQuery {
  categoryId?: string;
  popular?: boolean;
  search?: string;
  page: number;
}

/** One page (10 tests) of a group, of the most-requested list, or of a search. */
export async function fetchLabTestsPage(query: LabTestsQuery, locale: string): Promise<LabTestsPage> {
  const response = await publicApiClient.get<ApiListResponse<ServiceItem>>("/services", {
    params: {
      service_kind: "LAB",
      category_id: query.categoryId,
      is_popular: query.popular ? true : undefined,
      search: query.search?.trim() || undefined,
      page: query.page,
      limit: LAB_TESTS_PAGE_SIZE,
    },
    timeout: 10_000,
  });
  const list = normalizeListResponse<ServiceItem>(response.data);
  const total = Number(list.pagination.total || 0);
  return {
    entries: list.data.map((item) => mapLabTest(item, locale)),
    page: query.page,
    total,
    hasNext: query.page * LAB_TESTS_PAGE_SIZE < total,
  };
}

export function isLabEntry(entry: PublicCatalogEntry) {
  return entry.type === "service" && entry.serviceKind === "LAB";
}

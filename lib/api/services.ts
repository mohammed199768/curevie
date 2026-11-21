import { apiClient, publicApiClient } from "./client";
import { ApiListResponse, ServiceCategory, ServiceItem, ServiceKind } from "./types";

export interface ServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  service_kind?: ServiceKind;
  category_id?: string;
  /** Lab "most requested" tests. */
  is_popular?: boolean;
}

export interface ServiceCategoriesQuery {
  page?: number;
  limit?: number;
  service_kind?: ServiceKind;
  is_specialized?: boolean;
}

/** GET /services/counts: what a public visitor can order, grouped by kind and admin category. */
export interface PublicCatalogCounts {
  services: Array<{ service_kind: ServiceKind | null; category_id: string | null; count: number }>;
  packages: number;
}

export const servicesApi = {
  list: (params?: ServicesQuery) =>
    apiClient.get<ApiListResponse<ServiceItem>>("/services", { params }),

  listPublic: (params?: ServicesQuery) =>
    publicApiClient.get<ApiListResponse<ServiceItem>>("/services", { params }),

  /** One active service (404 for inactive or internal items). The body is the service itself, no envelope. */
  getPublic: (id: string) =>
    publicApiClient.get<ServiceItem>(`/services/${encodeURIComponent(id)}`, { timeout: 10_000 }),

  /** Catalog groups, ordered by sort_order. */
  listCategoriesPublic: (params?: ServiceCategoriesQuery) =>
    publicApiClient.get<ApiListResponse<ServiceCategory>>("/services/categories", { params, timeout: 10_000 }),

  publicCounts: () =>
    publicApiClient.get<{ data: PublicCatalogCounts }>("/services/counts"),
};

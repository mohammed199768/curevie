import { apiClient, publicApiClient } from "./client";
import { ApiListResponse, ServiceItem, ServiceKind } from "./types";

export interface ServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  service_kind?: ServiceKind;
  category_id?: string;
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

  publicCounts: () =>
    publicApiClient.get<{ data: PublicCatalogCounts }>("/services/counts"),
};

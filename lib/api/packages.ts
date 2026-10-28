import { apiClient, publicApiClient } from "./client";
import { ApiListResponse, PackageItem } from "./types";

export interface PackagesQuery {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: string;
}

/** Fixed-price bundles of services (medical, nursing, radiology and lab tests). */
export const packagesApi = {
  list: (params?: PackagesQuery) =>
    apiClient.get<ApiListResponse<PackageItem>>("/packages", { params }),

  listPublic: (params?: PackagesQuery) =>
    publicApiClient.get<ApiListResponse<PackageItem>>("/packages", { params }),

  getById: (id: string) =>
    apiClient.get<PackageItem>(`/packages/${id}`),
};

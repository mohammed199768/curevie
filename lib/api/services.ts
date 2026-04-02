import { apiClient, publicApiClient } from "./client";
import { ApiListResponse, LabTestItem, PackageItem, ServiceItem } from "./types";

export interface ServicesQuery {
  page?: number;
  limit?: number;
  search?: string;
  service_kind?: "MEDICAL" | "RADIOLOGY";
}

export interface PackagesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

export const servicesApi = {
  list: (params?: ServicesQuery) =>
    apiClient.get<ApiListResponse<ServiceItem>>("/services", { params }),

  listPublic: (params?: ServicesQuery) =>
    publicApiClient.get<ApiListResponse<ServiceItem>>("/services", { params }),

  listLab: (params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) =>
    apiClient.get<ApiListResponse<LabTestItem>>("/lab", { params }),

  listLabPublic: (params?: { page?: number; limit?: number; search?: string; is_active?: boolean }) =>
    publicApiClient.get<ApiListResponse<LabTestItem>>("/lab", { params }),

  listPackages: (params?: PackagesQuery) =>
    apiClient.get<ApiListResponse<PackageItem>>("/lab/packages", { params }),

  listPackagesPublic: (params?: PackagesQuery) =>
    publicApiClient.get<ApiListResponse<PackageItem>>("/lab/packages", { params }),
};


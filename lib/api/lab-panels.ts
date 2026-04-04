import { apiClient, publicApiClient } from "./client";
import { ApiListResponse, LabPackageItem, LabPanelItem } from "./types";

export interface LabCatalogListParams {
  is_active?: boolean;
  search?: string;
  limit?: number;
  page?: number;
}

export const labPanelsApi = {
  list: (params?: LabCatalogListParams) =>
    apiClient.get<ApiListResponse<LabPanelItem>>("/lab/panels", { params }),
  listPublic: (params?: LabCatalogListParams) =>
    publicApiClient.get<ApiListResponse<LabPanelItem>>("/lab/panels", { params }),
  getById: (id: string) =>
    apiClient.get<LabPanelItem>(`/lab/panels/${id}`),
  getByIdPublic: (id: string) =>
    publicApiClient.get<LabPanelItem>(`/lab/panels/${id}`),
};

export const labPackagesApi = {
  list: (params?: LabCatalogListParams) =>
    apiClient.get<ApiListResponse<LabPackageItem>>("/lab/lab-packages", { params }),
  listPublic: (params?: LabCatalogListParams) =>
    publicApiClient.get<ApiListResponse<LabPackageItem>>("/lab/lab-packages", { params }),
  getById: (id: string) =>
    apiClient.get<LabPackageItem>(`/lab/lab-packages/${id}`),
  getByIdPublic: (id: string) =>
    publicApiClient.get<LabPackageItem>(`/lab/lab-packages/${id}`),
};

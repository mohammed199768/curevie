import { apiClient } from "./client";
import { ApiListResponse, PatientUser, PointsLogItem } from "./types";

export interface UpdateProfilePayload {
  full_name?: string;
  phone?: string;
  address?: string;
  gender?: string;
  date_of_birth?: string;
}

export interface UpdateMedicalPayload {
  height?: number;
  weight?: number;
  allergies?: string;
  gender?: string;
}

export const patientsApi = {
  getById: (id: string) => apiClient.get<{ patient: PatientUser } | PatientUser>(`/patients/${id}`),

  updateProfile: (id: string, data: UpdateProfilePayload) => apiClient.put<PatientUser>(`/patients/${id}/profile`, data),

  updateMedical: (id: string, data: UpdateMedicalPayload) => apiClient.put<PatientUser>(`/patients/${id}/medical`, data),

  updateAvatar: (id: string, formData: FormData) =>
    apiClient.put<PatientUser>(`/patients/${id}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  pointsLog: (id: string, params?: { page?: number; limit?: number }) =>
    apiClient.get<ApiListResponse<PointsLogItem>>(`/patients/${id}/points-log`, { params }),
};


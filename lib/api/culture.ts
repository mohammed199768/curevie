import { apiClient } from "./client";

export interface SensitivityEntry {
  antibiotic_name: string;
  mic_value?: string | null;
  interpretation: "S" | "I" | "R";
}

export interface CultureResult {
  id: string;
  lab_result_id: string;
  growth_status: "NO_GROWTH" | "GROWTH" | "CONTAMINATED" | "PENDING";
  organism_name: string | null;
  colony_count: string | null;
  notes: string | null;
  sensitivity: SensitivityEntry[] | null;
  created_at: string;
}

export interface UpsertCulturePayload {
  growth_status: "NO_GROWTH" | "GROWTH" | "CONTAMINATED" | "PENDING";
  organism_name?: string | null;
  colony_count?: string | null;
  notes?: string | null;
  sensitivity?: SensitivityEntry[];
}

export const cultureApi = {
  get: (labResultId: string) =>
    apiClient.get<CultureResult | null>(`/lab-results/${labResultId}/culture`),
  upsert: (labResultId: string, data: UpsertCulturePayload) =>
    apiClient.put<CultureResult>(`/lab-results/${labResultId}/culture`, data),
  delete: (labResultId: string) =>
    apiClient.delete<{ deleted: number }>(`/lab-results/${labResultId}/culture`),
};

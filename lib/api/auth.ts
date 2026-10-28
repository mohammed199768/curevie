import { apiClient } from "./client";
import { LoginResponse, PatientUser } from "./types";

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
  phone: string;
  secondary_phone?: string;
  address?: string;
  area_id?: string;
  date_of_birth?: string;
  gender?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>("/auth/login", { email, password, role: "PATIENT" }),

  register: (data: RegisterPayload) => apiClient.post<LoginResponse>("/auth/register", data),

  /** Reads the current patient. Pass a token to use it explicitly (session restore) without retry/redirect. */
  me: (accessToken?: string) =>
    apiClient.get<PatientUser>("/auth/me", accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` }, skipAuthRefresh: true }
      : undefined),

  logout: () => apiClient.post<{ message: string }>("/auth/logout", {}),

  changePassword: (data: ChangePasswordPayload) =>
    apiClient.put<{ message: string }>("/auth/change-password", data),
};

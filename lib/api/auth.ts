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
  date_of_birth?: string;
  gender?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>("/auth/login", { email, password, role: "PATIENT" }),

  register: (data: RegisterPayload) => apiClient.post<LoginResponse>("/auth/register", data),

  me: () => apiClient.get<PatientUser>("/auth/me"),

  logout: () =>
    apiClient.post<{ message: string }>("/auth/logout", {}, { withCredentials: true }), // FIX: F14 — send credentials so the backend can clear the httpOnly refresh-token cookie.

  changePassword: (data: ChangePasswordPayload) =>
    apiClient.put<{ message: string }>("/auth/change-password", data),
};


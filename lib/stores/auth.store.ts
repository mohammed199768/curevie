import { create } from "zustand";
import type { PatientUser } from "@/lib/api/types";

export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  secondary_phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  area_id?: string | null;
  avatar_url?: string | null;
  is_vip?: boolean;
  vip_discount?: number | string | null;
  role: "PATIENT";
}

interface AuthState {
  patient: Patient | null;
  /** Short-lived access token. Kept in memory only; the refresh token lives in an httpOnly cookie. */
  accessToken: string | null;
  isAuthenticated: boolean;
  /** True once the session restore attempt (POST /auth/refresh on page load) has finished. */
  hydrated: boolean;
  setAuth: (patient: Patient, accessToken: string) => void;
  setAccessToken: (accessToken: string) => void;
  patchPatient: (patientPatch: Partial<Patient>) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export function toPatient(user: PatientUser): Patient {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone || "",
    secondary_phone: user.secondary_phone ?? null,
    gender: user.gender ?? null,
    date_of_birth: user.date_of_birth ?? null,
    address: user.address ?? null,
    area_id: user.area_id ?? null,
    avatar_url: user.avatar_url ?? null,
    is_vip: Boolean(user.is_vip),
    vip_discount: user.vip_discount ?? null,
    role: "PATIENT",
  };
}

export const useAuthStore = create<AuthState>()((set) => ({
  patient: null,
  accessToken: null,
  isAuthenticated: false,
  hydrated: false,
  setAuth: (patient, accessToken) => set({ patient, accessToken, isAuthenticated: true, hydrated: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  patchPatient: (patientPatch) =>
    set((state) => ({
      patient: state.patient ? { ...state.patient, ...patientPatch } : state.patient,
    })),
  logout: () =>
    set({
      patient: null,
      accessToken: null,
      isAuthenticated: false,
    }),
  setHydrated: (value) => set({ hydrated: value }),
}));

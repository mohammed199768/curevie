import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface Patient {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  avatar_url?: string | null;
  points: number;
  role: "PATIENT";
}

interface AuthState {
  patient: Patient | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  hydrated: boolean;
  setAuth: (patient: Patient, accessToken: string, refreshToken?: string | null) => void; // FIX: F14 — keep the refresh token optional because it now lives in an httpOnly cookie.
  setTokens: (accessToken: string, refreshToken?: string | null) => void; // FIX: F14 — let refresh flows update only the access token while keeping cookie-based refresh opaque to JS.
  patchPatient: (patientPatch: Partial<Patient>) => void;
  logout: () => void;
  setHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      patient: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      hydrated: false,
      setAuth: (patient, accessToken, refreshToken = null) => { // FIX: F14 — default the JS-visible refresh token to null under the cookie architecture.
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken);
          localStorage.removeItem("refresh_token"); // FIX: F14 — clear any stale refresh token because the browser cookie now owns refresh state.
        }

        set({ patient, accessToken, refreshToken, isAuthenticated: true }); // FIX: F14 — persist only the access token while keeping refresh state null in the store.
      },
      setTokens: (accessToken, refreshToken = null) => { // FIX: F14 — let refresh flows update only the access token while the cookie stores the refresh token.
        if (typeof window !== "undefined") {
          localStorage.setItem("access_token", accessToken); // FIX: F14 — persist the refreshed access token for header attachment.
          localStorage.removeItem("refresh_token"); // FIX: F14 — clear any stale JS-managed refresh token after refresh succeeds.
        }

        set({ accessToken, refreshToken, isAuthenticated: true }); // FIX: F14 — keep Zustand access-token state in sync after a refresh cycle.
      },
      patchPatient: (patientPatch) =>
        set((state) => ({
          patient: state.patient ? { ...state.patient, ...patientPatch } : state.patient,
        })),
      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token"); // FIX: F14 — remove any stale refresh token key left from the old storage model.
        }

        set({
          patient: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: "curevie-patient-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        patient: state.patient,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }), // FIX: F14 — persist only the patient identity and access token because refresh lives in the cookie.
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
    },
  ),
);

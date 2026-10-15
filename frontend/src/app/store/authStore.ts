/**
 * BrewLite — Zustand Auth Store (Task 7)
 * Quản lý trạng thái xác thực người dùng, persist vào localStorage.
 * Pattern đồng bộ với cartStore.ts (Task 5).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface AuthUser {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: "brewlite-auth",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? localStorage : sessionStorage
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// ─── API helper với Bearer Token ─────────────────────────────────────────────

const API_BASE = "http://localhost:3001";

/** Gọi API Backend với Authorization header tự động */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

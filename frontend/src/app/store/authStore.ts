/**
 * BrewLite — Zustand Auth Store (Task 7 + Sprint 4 RBAC)
 * Quản lý trạng thái xác thực người dùng, persist vào localStorage.
 * Pattern đồng bộ với cartStore.ts (Task 5).
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type UserRole = "CUSTOMER" | "STAFF" | "ADMIN";

export interface UserVoucherItem {
  id?: number;
  code: string;
  quantity: number;
  discountPercent: number;
  minOrderAmount: number;
  maxDiscountAmount?: number | null;
}

export interface AuthUser {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  role?: UserRole;
  loyaltyPoints?: number;
  vouchers?: UserVoucherItem[];
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
  refreshProfile: () => Promise<void>;
  redeemPoints: (
    points: number,
    description?: string,
    voucherData?: { code: string; discountPercent: number; minOrderAmount?: number }
  ) => Promise<{ success: boolean; message: string; voucher?: UserVoucherItem; vouchers?: UserVoucherItem[] }>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      _hasHydrated: false,

      setAuth: (user, token) =>
        set({ user, token, isAuthenticated: true }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false }),

      setHasHydrated: (state) => set({ _hasHydrated: state }),

      refreshProfile: async () => {
        const token = get().token;
        if (!token) return;
        try {
          const res = await apiFetch("/auth/me");
          if (res.ok) {
            const data = await res.json();
            set((state) => ({
              user: state.user ? { ...state.user, ...data } : data,
            }));
          }
        } catch {
          // ignore network error
        }
      },

      redeemPoints: async (
        points: number,
        description?: string,
        voucherData?: { code: string; discountPercent: number; minOrderAmount?: number }
      ) => {
        const token = get().token;
        if (!token) return { success: false, message: "Vui lòng đăng nhập để đổi quà" };
        try {
          const res = await apiFetch("/auth/redeem-points", {
            method: "POST",
            body: JSON.stringify({
              points,
              description,
              voucherCode: voucherData?.code,
              discountPercent: voucherData?.discountPercent,
              minOrderAmount: voucherData?.minOrderAmount,
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            return { success: false, message: data.message || "Đổi điểm thất bại" };
          }

          if (data.user) {
            set((state) => ({
              user: state.user ? { ...state.user, ...data.user } : data.user,
            }));
          } else {
            // Client accumulation fallback
            set((state) => {
              if (!state.user) return state;
              const prevVouchers = [...(state.user.vouchers || [])];
              if (voucherData) {
                const idx = prevVouchers.findIndex((v) => v.code === voucherData.code);
                if (idx >= 0) {
                  prevVouchers[idx] = {
                    ...prevVouchers[idx],
                    quantity: (prevVouchers[idx].quantity || 1) + 1,
                  };
                } else {
                  prevVouchers.push({
                    code: voucherData.code,
                    quantity: 1,
                    discountPercent: voucherData.discountPercent,
                    minOrderAmount: voucherData.minOrderAmount || 0,
                  });
                }
              }
              return {
                user: {
                  ...state.user,
                  loyaltyPoints: typeof data.remainingPoints === "number"
                    ? data.remainingPoints
                    : Math.max(0, (state.user.loyaltyPoints || 0) - points),
                  vouchers: data.vouchers || prevVouchers,
                },
              };
            });
          }

          return {
            success: true,
            message: data.message || "Đổi điểm thành công!",
            voucher: data.voucher,
            vouchers: data.vouchers,
          };
        } catch {
          return { success: false, message: "Lỗi kết nối máy chủ" };
        }
      },
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

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

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

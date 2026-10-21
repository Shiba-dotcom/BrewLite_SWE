"use client";

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrewLiteLogo from "../components/BrewLiteLogo";
import { useAuthStore, apiFetch } from "../store/authStore";

// ─── Types ──────────────────────────────────────────────────────────────────

interface RecipeBreakdownItem {
  ingredientCode: string;
  ingredientName: string;
  unit: string;
  amountPerUnit: number;
  totalAmount: number;
}

interface ToppingBreakdownItem {
  toppingName: string;
  ingredientName: string;
  unit: string;
  totalAmount: number;
}

interface OrderItem {
  id: number;
  productId: number;
  productName?: string;
  quantity: number;
  unitPrice: number;
  size?: string | null;
  toppings?: string[] | string | null;
  notes?: string | null;
  recipeBreakdown?: RecipeBreakdownItem[];
  toppingBreakdown?: ToppingBreakdownItem[];
  product?: {
    id: number;
    name: string;
    imageUrl?: string | null;
  };
}

interface BaristaOrder {
  id: number;
  userId: number;
  status: "PAID" | "PREPARING" | "READY" | "COMPLETED" | "CANCELLED";
  totalAmount: number;
  discountAmount?: number;
  discountCode?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: number;
    fullName: string | null;
    phone: string | null;
    email: string;
  };
  items: OrderItem[];
}

interface IngredientStock {
  id: number;
  code: string;
  name: string;
  unit: string;
  stock: number;
  minThreshold: number;
  status: "OK" | "LOW_STOCK" | "OUT_OF_STOCK";
  percentage: number;
}

interface StandardProductRecipe {
  id: number;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
  availableServings?: number;
  isOutOfStock?: boolean;
  recipes: Array<{
    id: number;
    size: string;
    amount: number;
    ingredient: IngredientStock;
  }>;
}

interface StandardToppingRecipe {
  id: number;
  toppingId?: string;
  toppingCode?: string;
  toppingName: string;
  amount: number;
  ingredient: IngredientStock;
}

type StaffViewTab = "kds" | "lookup" | "history";

// ─── Helper: Web Audio Chime ────────────────────────────────────────────────

function playWebAudioChime() {
  if (typeof window === "undefined") return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // 2-tone coffee bar chime (E5 -> B5)
    const freqs = [659.25, 987.77];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);
      gain.gain.setValueAtTime(0.18, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.46);
    });
  } catch {
    // Ignore audio context block if user hasn't interacted yet
  }
}

function parseToppingsList(toppings: string[] | string | null | undefined): string[] {
  if (!toppings) return [];
  if (Array.isArray(toppings)) return toppings;
  if (typeof toppings === "string" && toppings.trim()) {
    try {
      const parsed = JSON.parse(toppings);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return toppings
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

// ─── Main Barista KDS Workstation Page ──────────────────────────────────────

export default function BaristaKdsPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();

  // Navigation & View States
  const [activeTab, setActiveTab] = useState<StaffViewTab>("kds");
  const [orders, setOrders] = useState<BaristaOrder[]>([]);
  const [ingredients, setIngredients] = useState<IngredientStock[]>([]);
  const [standardProducts, setStandardProducts] = useState<StandardProductRecipe[]>([]);
  const [standardToppings, setStandardToppings] = useState<StandardToppingRecipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);

  // Workbench & Interactive Checklist States
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [workbenchOpen, setWorkbenchOpen] = useState<boolean>(true);
  const [checkedSteps, setCheckedSteps] = useState<Record<string, boolean>>({});

  // Filter & Utility States
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [lookupSearch, setLookupSearch] = useState<string>("");
  const [nowMs, setNowMs] = useState<number>(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const prevPaidIdsRef = useRef<Set<number>>(new Set());

  // Live 1-second timer for SLA & Digital Clock
  useEffect(() => {
    setNowMs(Date.now());
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auth & Role Guard
  useEffect(() => {
    if (_hasHydrated) {
      if (!isAuthenticated || !user) {
        router.replace("/login?redirect=/staff");
      } else if (user.role !== "STAFF" && user.role !== "ADMIN") {
        router.replace("/menu");
      }
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3200);
  };

  // Poll GET /orders/barista/queue every 3 seconds
  const fetchQueue = useCallback(async () => {
    if (!_hasHydrated || !isAuthenticated) return;
    try {
      const res = await apiFetch("/orders/barista/queue", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: BaristaOrder[] = await res.json();
      if (Array.isArray(data)) {
        const currentPaidIds = new Set(
          data.filter((o) => o.status === "PAID").map((o) => o.id)
        );
        if (prevPaidIdsRef.current.size > 0 && soundEnabled) {
          for (const id of currentPaidIds) {
            if (!prevPaidIdsRef.current.has(id)) {
              playWebAudioChime();
              showToast(`🔔 Đơn mới #BL-${id} vừa thanh toán! Đã đưa vào hàng đợi.`);
              break;
            }
          }
        }
        prevPaidIdsRef.current = currentPaidIds;
        setOrders(data);
      }
    } catch {
      // Ignore transient network hiccups during polling
    } finally {
      setIsLoading(false);
    }
  }, [_hasHydrated, isAuthenticated, soundEnabled]);

  // Fetch Stock & Standard Recipe Matrix for Tab 2 & KPI alerts
  const fetchStockAndRecipes = useCallback(async () => {
    if (!_hasHydrated || !isAuthenticated) return;
    try {
      const [ingRes, recRes, prodRes] = await Promise.all([
        apiFetch("/inventory/ingredients", { cache: "no-store" }),
        apiFetch("/inventory/recipes", { cache: "no-store" }),
        apiFetch("/products", { cache: "no-store" }),
      ]);

      if (ingRes.ok) {
        const ingData = await ingRes.json();
        setIngredients(Array.isArray(ingData) ? ingData : []);
      }

      const prodList = prodRes.ok ? await prodRes.json() : [];
      if (recRes.ok) {
        const recData = await recRes.json();
        const rawProds: StandardProductRecipe[] = Array.isArray(recData?.products)
          ? recData.products
          : [];
        setStandardProducts(
          rawProds.map((rp) => {
            const matched = Array.isArray(prodList)
              ? prodList.find((p: { id: number }) => p.id === rp.id)
              : null;
            return {
              ...rp,
              availableServings: matched?.availableServings ?? 0,
              isOutOfStock: matched?.isOutOfStock ?? false,
            };
          })
        );
        setStandardToppings(
          Array.isArray(recData?.toppingRecipes) ? recData.toppingRecipes : []
        );
      }
    } catch {
      // Ignore error
    }
  }, [_hasHydrated, isAuthenticated]);

  useEffect(() => {
    fetchQueue();
    fetchStockAndRecipes();
    const qInterval = setInterval(fetchQueue, 3000);
    const sInterval = setInterval(fetchStockAndRecipes, 12000);
    return () => {
      clearInterval(qInterval);
      clearInterval(sInterval);
    };
  }, [fetchQueue, fetchStockAndRecipes]);

  // Filter orders by search query
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        String(order.id).includes(q) ||
        `#bl-${order.id}`.includes(q) ||
        (order.user?.fullName && order.user.fullName.toLowerCase().includes(q)) ||
        (order.user?.phone && order.user.phone.includes(q)) ||
        (Array.isArray(order.items) &&
          order.items.some((i) =>
            (i.productName || i.product?.name || "").toLowerCase().includes(q)
          ))
      );
    });
  }, [orders, searchTerm]);

  const paidOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "PAID"),
    [filteredOrders]
  );
  const preparingOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "PREPARING"),
    [filteredOrders]
  );
  const readyOrders = useMemo(
    () => filteredOrders.filter((o) => o.status === "READY"),
    [filteredOrders]
  );
  const completedOrders = useMemo(
    () =>
      filteredOrders
        .filter((o) => o.status === "COMPLETED")
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [filteredOrders]
  );

  const activeKdsOrders = useMemo(
    () => [...preparingOrders, ...paidOrders, ...readyOrders],
    [preparingOrders, paidOrders, readyOrders]
  );

  // Auto-select an active order for the right-hand Preparation Workbench
  useEffect(() => {
    if (activeKdsOrders.length === 0) {
      if (selectedOrderId !== null) setSelectedOrderId(null);
      return;
    }
    const stillExists = activeKdsOrders.some((o) => o.id === selectedOrderId);
    if (!stillExists) {
      setSelectedOrderId(activeKdsOrders[0].id);
    }
  }, [activeKdsOrders, selectedOrderId]);

  const selectedOrder = useMemo(
    () => activeKdsOrders.find((o) => o.id === selectedOrderId) || null,
    [activeKdsOrders, selectedOrderId]
  );

  const toggleChecklistStep = (key: string) => {
    setCheckedSteps((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleTransitionStatus = async (
    orderId: number,
    nextStatus: "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await apiFetch(`/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast(err.message || "Không thể chuyển trạng thái đơn hàng");
        return;
      }
      const statusLabels: Record<string, string> = {
        PREPARING: "Đang pha chế (PREPARING)",
        READY: "Sẵn sàng trả khách (READY)",
        COMPLETED: "Hoàn tất giao khách (COMPLETED)",
        CANCELLED: "Đã hủy & hoàn kho tự động (CANCELLED)",
      };
      showToast(
        `✅ Đơn #BL-${orderId} → ${statusLabels[nextStatus] || nextStatus}`
      );
      await Promise.all([fetchQueue(), fetchStockAndRecipes()]);
    } catch {
      showToast("Lỗi kết nối máy chủ khi cập nhật trạng thái");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const formatElapsed = (isoDate: string) => {
    const dateObj = new Date(isoDate);
    const clockTime = Number.isNaN(dateObj.getTime())
      ? "--:--"
      : dateObj.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });

    if (!nowMs || Number.isNaN(dateObj.getTime())) {
      return {
        text: "00:00",
        clockTime,
        mins: 0,
        level: "normal" as const,
        badgeClass:
          "bg-[#2D6A4F]/10 text-[#2D6A4F] border border-[#2D6A4F]/25",
      };
    }
    const diffSec = Math.max(0, Math.floor((nowMs - dateObj.getTime()) / 1000));
    const mins = Math.floor(diffSec / 60);
    const secs = diffSec % 60;

    let text = "";
    if (mins < 60) {
      text = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    } else if (mins < 1440) {
      const hours = Math.floor(mins / 60);
      const remMins = mins % 60;
      text = `${hours}g ${String(remMins).padStart(2, "0")}p`;
    } else {
      const days = Math.floor(mins / 1440);
      const remHours = Math.floor((mins % 1440) / 60);
      text = `${days}ng ${remHours}g`;
    }

    if (mins >= 7) {
      return {
        text,
        clockTime,
        mins,
        level: "urgent" as const,
        badgeClass:
          "bg-[#991B1B] text-white border border-[#991B1B] shadow-xs",
      };
    }
    if (mins >= 4) {
      return {
        text,
        clockTime,
        mins,
        level: "warning" as const,
        badgeClass:
          "bg-[#FFF7ED] text-[#B45309] border border-[#D97736]/50",
      };
    }
    return {
      text,
      clockTime,
      mins,
      level: "normal" as const,
      badgeClass: "bg-[#ECFDF5] text-[#2D6A4F] border border-[#A7F3D0]",
    };
  };

  // Shift Telemetry Metrics
  const totalActiveCups = useMemo(
    () =>
      activeKdsOrders.reduce(
        (sum, o) =>
          sum + (o.items || []).reduce((s, item) => s + item.quantity, 0),
        0
      ),
    [activeKdsOrders]
  );

  const totalCompletedCups = useMemo(
    () =>
      completedOrders.reduce(
        (sum, o) =>
          sum + (o.items || []).reduce((s, item) => s + item.quantity, 0),
        0
      ),
    [completedOrders]
  );

  const lowStockIngredients = useMemo(
    () =>
      ingredients.filter(
        (i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK"
      ),
    [ingredients]
  );

  const currentClockText = useMemo(() => {
    if (!nowMs) return "--:--:--";
    return new Date(nowMs).toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, [nowMs]);

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#F6F1EC] flex items-center justify-center font-body text-[#2C1810]">
        Đang khởi tạo Trạm Điều Phối Barista KDS...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F1EC] text-[#1D1B19] flex flex-col font-body selection:bg-[#FEBC85] selection:text-[#2C1810]">
      {/* ── FLOATING TOAST NOTIFICATION ── */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl bg-[#2C1810] text-[#FEF8F4] shadow-2xl border border-[#FEBC85]/30 flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-[#FEBC85]">
            notifications_active
          </span>
          <span className="text-[13px] font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* ── 1. HIGH-CONTRAST ROASTED ESPRESSO COMMAND HEADER (#2C1810) ── */}
      <header className="sticky top-0 z-40 bg-gradient-to-r from-[#23120B] via-[#2C1810] to-[#361E14] text-[#FEF8F4] shadow-[0_10px_30px_rgba(44,24,16,0.22)] border-b border-white/10">
        <div className="max-w-[1720px] mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
          {/* Left: Brand + Live Station Telemetry */}
          <div className="flex items-center gap-4">
            <Link
              href="/menu"
              className="px-3 py-1.5 rounded-xl bg-[#FEF8F4] hover:bg-[#FEBC85] transition-colors flex items-center shadow-sm"
              title="Về trang Thực đơn Khách hàng"
            >
              <BrewLiteLogo className="h-7 w-auto" />
            </Link>

            <div className="hidden sm:flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#52B788] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#52B788]" />
              </span>
              <div className="flex flex-col">
                <span className="text-[11px] font-extrabold tracking-wider uppercase text-[#FEBC85] leading-none">
                  BARISTA KDS • TRẠM #01
                </span>
                <span className="text-[11px] text-white/80 font-mono mt-0.5 leading-none">
                  {currentClockText} • Auto-sync 3s
                </span>
              </div>
            </div>
          </div>

          {/* Center: 3-Tab Segmented Switcher */}
          <nav className="flex items-center p-1 rounded-2xl bg-[#160B06]/70 border border-white/10 shadow-inner">
            <button
              type="button"
              onClick={() => setActiveTab("kds")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "kds"
                  ? "bg-gradient-to-r from-[#FEBC85] to-[#F4A261] text-[#2C1810] shadow-md"
                  : "text-[#E3BFB2] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                view_kanban
              </span>
              <span>Điều phối KDS</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-extrabold ${
                  activeTab === "kds"
                    ? "bg-[#2C1810] text-[#FEBC85]"
                    : "bg-white/10 text-white"
                }`}
              >
                {activeKdsOrders.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("lookup")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "lookup"
                  ? "bg-gradient-to-r from-[#FEBC85] to-[#F4A261] text-[#2C1810] shadow-md"
                  : "text-[#E3BFB2] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                menu_book
              </span>
              <span>Công thức &amp; Tồn kho Quầy</span>
              {lowStockIngredients.length > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-[#DC2626] text-white text-[10px] font-mono font-extrabold">
                  !{lowStockIngredients.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-gradient-to-r from-[#FEBC85] to-[#F4A261] text-[#2C1810] shadow-md"
                  : "text-[#E3BFB2] hover:text-white"
              }`}
            >
              <span className="material-symbols-outlined text-base">
                history
              </span>
              <span>Nhật ký Ca ({completedOrders.length})</span>
            </button>
          </nav>

          {/* Right: Search, Audio Chime, Workbench Toggle & User Actions */}
          <div className="flex items-center gap-2.5">
            {/* Search Box */}
            <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/15 focus-within:bg-white/15 focus-within:border-[#FEBC85] transition-all w-56">
              <span className="material-symbols-outlined text-sm text-[#FEBC85]">
                search
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã #BL, khách, món..."
                className="bg-transparent text-xs text-white placeholder:text-white/50 focus:outline-none w-full font-body"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="text-white/60 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Audio Chime Toggle */}
            <button
              type="button"
              onClick={() => {
                const next = !soundEnabled;
                setSoundEnabled(next);
                if (next) playWebAudioChime();
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-[#2D6A4F]/30 border-[#52B788]/50 text-[#A7F3D0]"
                  : "bg-white/5 border-white/10 text-white/50"
              }`}
              title="Bật/tắt chuông báo đơn mới"
            >
              <span className="material-symbols-outlined text-base">
                {soundEnabled ? "volume_up" : "volume_off"}
              </span>
              <span className="hidden md:inline">
                {soundEnabled ? "Chuông BẬT" : "TẮT"}
              </span>
            </button>

            {/* Toggle Right Workbench Drawer */}
            {activeTab === "kds" && (
              <button
                type="button"
                onClick={() => setWorkbenchOpen(!workbenchOpen)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all cursor-pointer ${
                  workbenchOpen
                    ? "bg-[#FEBC85]/20 border-[#FEBC85]/50 text-[#FEBC85]"
                    : "bg-white/10 border-white/15 text-white/80 hover:text-white"
                }`}
                title="Đóng/Mở Bàn Pha Chế Chi Tiết bên phải"
              >
                <span className="material-symbols-outlined text-base">
                  dock_to_left
                </span>
                <span className="hidden sm:inline">Bàn Pha Chế</span>
              </button>
            )}

            {user?.role === "ADMIN" && (
              <Link
                href="/admin"
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-[#FEBC85] flex items-center gap-1 transition-all"
                title="Chuyển sang trang Quản trị Kho ERP"
              >
                <span className="material-symbols-outlined text-base">
                  inventory_2
                </span>
                <span className="hidden md:inline">Admin Kho</span>
              </Link>
            )}

            <button
              type="button"
              onClick={() => {
                logout();
                router.push("/login");
              }}
              className="p-2 rounded-xl bg-[#991B1B]/80 hover:bg-[#DC2626] text-white border border-red-400/30 transition-all cursor-pointer"
              title="Đăng xuất ca làm việc"
            >
              <span className="material-symbols-outlined text-base">
                logout
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2. HIGH-CONTRAST SHIFT TELEMETRY & KPI STRIP ── */}
      <section className="w-full max-w-[1720px] mx-auto px-4 md:px-6 pt-5 pb-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* KPI 1: Chờ nhận đơn (PAID) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E6DCD2] shadow-[0_4px_14px_rgba(44,24,16,0.04)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#B45309] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D97736]" />
                1. Chờ nhận đơn (PAID)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-[#2C1810]">
                  {paidOrders.length}
                </span>
                <span className="text-xs text-[#827470] font-semibold">
                  đơn mới thanh toán
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#FFF7ED] border border-[#FED7AA] text-[#D97736] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">
                receipt_long
              </span>
            </div>
          </div>

          {/* KPI 2: Đang pha chế (PREPARING) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E6DCD2] shadow-[0_4px_14px_rgba(44,24,16,0.04)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#845326] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#845326] animate-pulse" />
                2. Đang chiết xuất (PREP)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-[#2C1810]">
                  {preparingOrders.length}
                </span>
                <span className="text-xs text-[#827470] font-semibold">
                  đơn trên mặt quầy
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#FEF3C7]/60 border border-[#FDE68A] text-[#845326] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">
                coffee_maker
              </span>
            </div>
          </div>

          {/* KPI 3: Sẵn sàng trả khách (READY) */}
          <div className="bg-white rounded-2xl p-4 border border-[#E6DCD2] shadow-[0_4px_14px_rgba(44,24,16,0.04)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#2D6A4F] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#2D6A4F]" />
                3. Kệ Express Pickup (READY)
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-[#2D6A4F]">
                  {readyOrders.length}
                </span>
                <span className="text-xs text-[#827470] font-semibold">
                  đơn chờ khách lấy
                </span>
              </div>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#2D6A4F] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">
                notifications_active
              </span>
            </div>
          </div>

          {/* KPI 4: Hiệu suất ca & Cảnh báo kho */}
          <div className="bg-white rounded-2xl p-4 border border-[#E6DCD2] shadow-[0_4px_14px_rgba(44,24,16,0.04)] flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#504440]">
                Tổng ly đang làm / Đã giao
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl font-extrabold text-[#2C1810]">
                  {totalActiveCups}
                </span>
                <span className="text-xs text-[#2D6A4F] font-bold">
                  • Đã giao: {totalCompletedCups} ly
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActiveTab("lookup")}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                lowStockIngredients.length > 0
                  ? "bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]"
                  : "bg-[#F3EDE8] text-[#504440] hover:bg-[#E6DCD2]"
              }`}
              title="Xem tồn kho nguyên vật liệu tại quầy"
            >
              <span className="material-symbols-outlined text-base">
                {lowStockIngredients.length > 0 ? "warning" : "inventory"}
              </span>
              <span>
                {lowStockIngredients.length > 0
                  ? `${lowStockIngredients.length} sắp hết`
                  : "Kho OK"}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 3. MAIN WORKSPACE CONTENT BY ACTIVE TAB ── */}
      <main className="flex-1 w-full max-w-[1720px] mx-auto px-4 md:px-6 py-4">
        {/* =====================================================================
            TAB 1: HYBRID KDS WORKSTATION (3-COL KANBAN + PREPARATION WORKBENCH)
        ===================================================================== */}
        {activeTab === "kds" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
            {/* ── LEFT/CENTER: 3-COLUMN TACTILE KANBAN BOARD ── */}
            <div
              className={`${
                workbenchOpen ? "xl:col-span-8" : "xl:col-span-12"
              } grid grid-cols-1 lg:grid-cols-3 gap-4 items-start`}
            >
              {/* COLUMN 1: CHỜ NHẬN ĐƠN (PAID) */}
              <div className="rounded-3xl bg-[#EFE8E1] border border-[#E2D6CB] p-3.5 flex flex-col gap-3.5 min-h-[68vh]">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white border-l-4 border-[#D97736] shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-[#D97736]">
                      new_releases
                    </span>
                    <div>
                      <h2 className="font-headline font-bold text-[15px] text-[#2C1810] leading-none">
                        Chờ nhận đơn
                      </h2>
                      <span className="text-[11px] text-[#827470] font-medium">
                        Khách đã thanh toán (PAID)
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#FFF7ED] border border-[#FED7AA] font-mono font-extrabold text-xs text-[#D97736]">
                    {paidOrders.length}
                  </span>
                </div>

                {isLoading ? (
                  <div className="h-64 rounded-2xl bg-white/60 animate-pulse" />
                ) : paidOrders.length === 0 ? (
                  <EmptyColumnState
                    icon="inbox"
                    title="Không có đơn chờ nhận"
                    subtitle="Đơn mới thanh toán sẽ tự động đổ về đây kèm chuông báo."
                  />
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {paidOrders.map((order) => (
                      <HighContrastOrderTicket
                        key={order.id}
                        order={order}
                        accentColor="amber"
                        elapsed={formatElapsed(order.createdAt)}
                        isSelected={selectedOrder?.id === order.id}
                        onSelect={() => {
                          setSelectedOrderId(order.id);
                          setWorkbenchOpen(true);
                        }}
                        isUpdating={updatingOrderId === order.id}
                        primaryAction={{
                          label: "Nhận đơn & Bắt đầu pha",
                          icon: "play_arrow",
                          btnClass:
                            "bg-[#2C1810] hover:bg-[#3F2418] text-white shadow-sm",
                          onClick: () =>
                            handleTransitionStatus(order.id, "PREPARING"),
                        }}
                        onCancel={() =>
                          handleTransitionStatus(order.id, "CANCELLED")
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* COLUMN 2: ĐANG PHA CHẾ (PREPARING) */}
              <div className="rounded-3xl bg-[#EFE8E1] border border-[#E2D6CB] p-3.5 flex flex-col gap-3.5 min-h-[68vh]">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white border-l-4 border-[#845326] shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-[#845326]">
                      coffee_maker
                    </span>
                    <div>
                      <h2 className="font-headline font-bold text-[15px] text-[#2C1810] leading-none">
                        Đang pha chế
                      </h2>
                      <span className="text-[11px] text-[#827470] font-medium">
                        Đang chiết xuất tại quầy (PREP)
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#FEF3C7] border border-[#FDE68A] font-mono font-extrabold text-xs text-[#845326]">
                    {preparingOrders.length}
                  </span>
                </div>

                {isLoading ? (
                  <div className="h-64 rounded-2xl bg-white/60 animate-pulse" />
                ) : preparingOrders.length === 0 ? (
                  <EmptyColumnState
                    icon="coffee"
                    title="Máy pha đang rảnh"
                    subtitle="Bấm 'Nhận đơn & Bắt đầu pha' ở cột bên trái để đưa món vào chiết xuất."
                  />
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {preparingOrders.map((order) => (
                      <HighContrastOrderTicket
                        key={order.id}
                        order={order}
                        accentColor="bronze"
                        elapsed={formatElapsed(order.createdAt)}
                        isSelected={selectedOrder?.id === order.id}
                        onSelect={() => {
                          setSelectedOrderId(order.id);
                          setWorkbenchOpen(true);
                        }}
                        isUpdating={updatingOrderId === order.id}
                        primaryAction={{
                          label: "Pha xong • Báo khách lấy",
                          icon: "notifications_active",
                          btnClass:
                            "bg-[#D97736] hover:bg-[#C26225] text-white shadow-sm",
                          onClick: () =>
                            handleTransitionStatus(order.id, "READY"),
                        }}
                        onCancel={() =>
                          handleTransitionStatus(order.id, "CANCELLED")
                        }
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* COLUMN 3: SẴN SÀNG TRẢ KHÁCH (READY) */}
              <div className="rounded-3xl bg-[#EFE8E1] border border-[#E2D6CB] p-3.5 flex flex-col gap-3.5 min-h-[68vh]">
                <div className="flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white border-l-4 border-[#2D6A4F] shadow-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-lg text-[#2D6A4F]">
                      check_circle
                    </span>
                    <div>
                      <h2 className="font-headline font-bold text-[15px] text-[#2C1810] leading-none">
                        Chờ khách lấy
                      </h2>
                      <span className="text-[11px] text-[#827470] font-medium">
                        Tại kệ Express Pickup (READY)
                      </span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] font-mono font-extrabold text-xs text-[#2D6A4F]">
                    {readyOrders.length}
                  </span>
                </div>

                {isLoading ? (
                  <div className="h-64 rounded-2xl bg-white/60 animate-pulse" />
                ) : readyOrders.length === 0 ? (
                  <EmptyColumnState
                    icon="concierge"
                    title="Kệ trả món đang trống"
                    subtitle="Các đơn pha xong đang đợi khách nhận sẽ hiển thị tại đây."
                  />
                ) : (
                  <div className="flex flex-col gap-3.5">
                    {readyOrders.map((order) => (
                      <HighContrastOrderTicket
                        key={order.id}
                        order={order}
                        accentColor="emerald"
                        elapsed={formatElapsed(order.createdAt)}
                        isSelected={selectedOrder?.id === order.id}
                        onSelect={() => {
                          setSelectedOrderId(order.id);
                          setWorkbenchOpen(true);
                        }}
                        isUpdating={updatingOrderId === order.id}
                        primaryAction={{
                          label: "Đã giao khách (COMPLETED)",
                          icon: "task_alt",
                          btnClass:
                            "bg-[#2D6A4F] hover:bg-[#23533D] text-white shadow-sm",
                          onClick: () =>
                            handleTransitionStatus(order.id, "COMPLETED"),
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT: INTERACTIVE PREPARATION WORKBENCH PANEL (BÀN PHA CHẾ CHI TIẾT) ── */}
            {workbenchOpen && (
              <aside className="xl:col-span-4 sticky top-20 rounded-3xl bg-white border-2 border-[#2C1810]/15 shadow-[0_12px_32px_rgba(44,24,16,0.08)] overflow-hidden flex flex-col">
                <PreparationWorkbenchPanel
                  order={selectedOrder}
                  elapsed={
                    selectedOrder
                      ? formatElapsed(selectedOrder.createdAt)
                      : null
                  }
                  checkedSteps={checkedSteps}
                  onToggleStep={toggleChecklistStep}
                  isUpdating={
                    selectedOrder ? updatingOrderId === selectedOrder.id : false
                  }
                  onTransition={handleTransitionStatus}
                  onClose={() => setWorkbenchOpen(false)}
                />
              </aside>
            )}
          </div>
        )}

        {/* =====================================================================
            TAB 2: QUICK STOCK & STANDARD BOM RECIPE LOOKUP AT THE BAR
        ===================================================================== */}
        {activeTab === "lookup" && (
          <div className="flex flex-col gap-6">
            {/* Search & Summary Header */}
            <div className="bg-white rounded-3xl p-5 border border-[#E6DCD2] shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="font-headline text-xl font-bold text-[#2C1810]">
                  Tra cứu Tồn kho Quầy Bar &amp; Sổ tay Định lượng Chuẩn (BOM S / M / L)
                </h2>
                <p className="text-xs text-[#504440] mt-0.5">
                  Giúp Barista kiểm tra nhanh lượng nguyên liệu còn tại quầy và công thức gốc của 10 món + 4 loại Topping.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#F6F1EC] border border-[#E2D6CB] w-full sm:w-80">
                <span className="material-symbols-outlined text-base text-[#845326]">
                  search
                </span>
                <input
                  type="text"
                  value={lookupSearch}
                  onChange={(e) => setLookupSearch(e.target.value)}
                  placeholder="Tìm tên món hoặc nguyên liệu..."
                  className="bg-transparent text-xs text-[#1D1B19] placeholder:text-[#827470] focus:outline-none w-full"
                />
              </div>
            </div>

            {/* Live Bar Stock Strip (15 Ingredients) */}
            <div className="bg-white rounded-3xl p-5 border border-[#E6DCD2] shadow-xs">
              <h3 className="font-headline font-bold text-base text-[#2C1810] mb-3.5 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#845326]">
                  inventory_2
                </span>
                <span>Trạng thái 15 Nguyên vật liệu tại Quầy pha chế</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                {ingredients
                  .filter(
                    (i) =>
                      !lookupSearch.trim() ||
                      i.name.toLowerCase().includes(lookupSearch.toLowerCase()) ||
                      i.code.toLowerCase().includes(lookupSearch.toLowerCase())
                  )
                  .map((ing) => {
                    const isDanger = ing.stock <= (ing.minThreshold ?? 50);
                    const isWarn =
                      !isDanger && ing.stock <= (ing.minThreshold ?? 50) * 2;
                    return (
                      <div
                        key={ing.id}
                        className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 ${
                          isDanger
                            ? "bg-[#FEF2F2] border-[#FECACA]"
                            : isWarn
                            ? "bg-[#FFFBEB] border-[#FDE68A]"
                            : "bg-[#FBF9F7] border-[#E6DCD2]"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono text-[10px] font-bold text-[#845326]">
                              {ing.code}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                                isDanger
                                  ? "bg-[#991B1B] text-white"
                                  : isWarn
                                  ? "bg-[#D97736]/20 text-[#B45309]"
                                  : "bg-[#2D6A4F]/15 text-[#2D6A4F]"
                              }`}
                            >
                              {ing.stock <= 0
                                ? "HẾT KHO"
                                : isDanger
                                ? "SẮP HẾT"
                                : "ĐỦ DÙNG"}
                            </span>
                          </div>
                          <h4 className="font-bold text-xs text-[#2C1810] mt-1 line-clamp-1">
                            {ing.name}
                          </h4>
                        </div>
                        <div className="flex items-baseline justify-between pt-1 border-t border-[#2C1810]/5">
                          <span className="font-mono text-base font-extrabold text-[#2C1810]">
                            {ing.stock.toLocaleString("vi-VN")} {ing.unit}
                          </span>
                          <span className="text-[10px] text-[#827470]">
                            Min: {ing.minThreshold} {ing.unit}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Standard 10 Products BOM Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {standardProducts
                .filter(
                  (p) =>
                    !lookupSearch.trim() ||
                    p.name.toLowerCase().includes(lookupSearch.toLowerCase())
                )
                .map((prod) => {
                  const sizes = Array.from(
                    new Set(prod.recipes.map((r) => r.size))
                  );
                  return (
                    <div
                      key={prod.id}
                      className="bg-white rounded-3xl p-5 border border-[#E6DCD2] shadow-xs flex flex-col gap-3"
                    >
                      <div className="flex items-center justify-between border-b border-[#E6DCD2] pb-2.5">
                        <div>
                          <h4 className="font-headline font-bold text-base text-[#2C1810]">
                            {prod.name}
                          </h4>
                          <span className="text-xs text-[#845326] font-semibold">
                            Giá niêm yết: {prod.basePrice.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                            prod.isOutOfStock
                              ? "bg-[#991B1B] text-white"
                              : "bg-[#ECFDF5] text-[#2D6A4F] border border-[#A7F3D0]"
                          }`}
                        >
                          {prod.isOutOfStock
                            ? "Tạm hết nguyên liệu"
                            : `Pha được ~${prod.availableServings ?? 0} phần`}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {sizes.map((sz) => (
                          <div
                            key={sz}
                            className="p-3 rounded-2xl bg-[#F6F1EC] border border-[#E6DCD2] flex flex-col gap-1.5"
                          >
                            <span className="text-[11px] font-extrabold uppercase text-[#2C1810] border-b border-[#2C1810]/10 pb-1">
                              {sz === "ALL" ? "Khẩu phần Chuẩn" : `Size ${sz}`}
                            </span>
                            {prod.recipes
                              .filter((r) => r.size === sz)
                              .map((r) => (
                                <div
                                  key={r.id}
                                  className="flex items-center justify-between text-[11px]"
                                >
                                  <span className="text-[#504440] truncate pr-1">
                                    {r.ingredient.name}
                                  </span>
                                  <span className="font-mono font-bold text-[#2C1810] shrink-0">
                                    {r.amount} {r.ingredient.unit}
                                  </span>
                                </div>
                              ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Standard Toppings BOM */}
            <div className="bg-white rounded-3xl p-5 border border-[#E6DCD2] shadow-xs">
              <h3 className="font-headline font-bold text-base text-[#2C1810] mb-3">
                Định lượng chuẩn cho 4 loại Topping Cộng thêm
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {standardToppings.map((tp) => (
                  <div
                    key={tp.id}
                    className="p-3.5 rounded-2xl bg-[#F6F1EC] border border-[#E6DCD2] flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase text-[#845326]">
                        Topping #{tp.toppingId || tp.toppingCode}
                      </span>
                      <h4 className="font-bold text-xs text-[#2C1810]">
                        {tp.toppingName}
                      </h4>
                      <span className="text-[11px] text-[#504440]">
                        {tp.ingredient.name}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-[#2C1810] text-[#FEBC85] font-mono font-bold text-xs">
                      {tp.amount} {tp.ingredient.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* =====================================================================
            TAB 3: COMPLETED SHIFT LOG (NHẬT KÝ ĐƠN ĐÃ GIAO TRONG CA)
        ===================================================================== */}
        {activeTab === "history" && (
          <div className="bg-white rounded-3xl p-6 border border-[#E6DCD2] shadow-xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6DCD2] pb-4">
              <div>
                <h2 className="font-headline text-xl font-bold text-[#2C1810]">
                  Nhật ký Đơn hàng Đã hoàn tất trong Ca (COMPLETED)
                </h2>
                <p className="text-xs text-[#504440]">
                  Tổng cộng đã pha chế và bàn giao thành công{" "}
                  <strong>{completedOrders.length} đơn hàng</strong> (
                  <strong>{totalCompletedCups} ly/phần</strong>).
                </p>
              </div>
            </div>

            {completedOrders.length === 0 ? (
              <div className="py-12 text-center text-[#827470]">
                <span className="material-symbols-outlined text-4xl mb-2">
                  history
                </span>
                <p className="text-sm font-semibold">
                  Chưa có đơn hàng nào hoàn tất trong ca hiện tại.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6DCD2] text-[11px] font-bold uppercase tracking-wider text-[#827470]">
                      <th className="py-3 px-4">Mã Đơn</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Chi tiết món đã pha</th>
                      <th className="py-3 px-4">Giờ hoàn tất</th>
                      <th className="py-3 px-4 text-right">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6DCD2]/60 text-xs">
                    {completedOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#F6F1EC]/60">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#2C1810]">
                          #BL-{ord.id}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#504440]">
                          {ord.user?.fullName ||
                            ord.user?.email ||
                            "Khách vãng lai"}
                          {ord.user?.phone ? ` (${ord.user.phone})` : ""}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {(ord.items || []).map((it) => (
                              <span
                                key={it.id}
                                className="px-2.5 py-0.5 rounded-lg bg-[#F6F1EC] border border-[#E6DCD2] font-semibold text-[#2C1810]"
                              >
                                {it.quantity}x{" "}
                                {it.productName ||
                                  it.product?.name ||
                                  `#${it.productId}`}{" "}
                                ({it.size || "M"})
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[#827470]">
                          {new Date(ord.updatedAt).toLocaleTimeString("vi-VN")}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#2D6A4F]">
                          {ord.totalAmount.toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Subcomponent: Empty Column State ───────────────────────────────────────

function EmptyColumnState({
  icon,
  title,
  subtitle,
}: {
  icon: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8 rounded-2xl bg-white/50 border border-dashed border-[#D5C7B8] text-[#827470]">
      <span className="material-symbols-outlined text-4xl mb-2 text-[#845326]/50">
        {icon}
      </span>
      <p className="text-sm font-bold text-[#504440]">{title}</p>
      <p className="text-xs mt-1 max-w-[230px] leading-relaxed">{subtitle}</p>
    </div>
  );
}

// ─── Subcomponent: High-Contrast Tactile Order Ticket Card ──────────────────

function HighContrastOrderTicket({
  order,
  accentColor,
  elapsed,
  isSelected,
  onSelect,
  isUpdating,
  primaryAction,
  onCancel,
}: {
  order: BaristaOrder;
  accentColor: "amber" | "bronze" | "emerald";
  elapsed: {
    text: string;
    clockTime: string;
    mins: number;
    level: "normal" | "warning" | "urgent";
    badgeClass: string;
  };
  isSelected: boolean;
  onSelect: () => void;
  isUpdating: boolean;
  primaryAction: {
    label: string;
    icon: string;
    btnClass: string;
    onClick: () => void;
  };
  onCancel?: () => void;
}) {
  const topBarClass =
    accentColor === "amber"
      ? "bg-[#D97736]"
      : accentColor === "bronze"
      ? "bg-[#845326]"
      : "bg-[#2D6A4F]";

  const totalCups = (order.items || []).reduce((s, i) => s + i.quantity, 0);

  return (
    <article
      onClick={onSelect}
      className={`rounded-2xl bg-white overflow-hidden transition-all cursor-pointer flex flex-col ${
        isSelected
          ? "ring-2 ring-[#2C1810] shadow-[0_10px_24px_rgba(44,24,16,0.14)] -translate-y-0.5"
          : "border border-[#E2D6CB] shadow-[0_4px_12px_rgba(44,24,16,0.05)] hover:shadow-md"
      }`}
    >
      {/* Top Status Color Bar */}
      <div className={`h-1.5 w-full ${topBarClass}`} />

      <div className="p-3.5 flex flex-col gap-3">
        {/* Ticket Header: Row 1 (ID + Time Badge guaranteed visible) */}
        <div className="flex flex-col gap-1.5 pb-2.5 border-b border-[#F0E9E2]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-mono font-extrabold text-[16px] text-[#2C1810] shrink-0">
                #BL-{order.id}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-[#F6F1EC] border border-[#E2D6CB] text-[11px] font-bold text-[#2C1810] shrink-0">
                {totalCups} món
              </span>
            </div>

            <div
              className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-extrabold flex items-center gap-1 shrink-0 whitespace-nowrap ${elapsed.badgeClass}`}
              title={`Giờ đặt đơn: ${elapsed.clockTime} • Thời gian chờ: ${elapsed.text}`}
            >
              <span className="material-symbols-outlined text-[13px]">
                schedule
              </span>
              <span>{elapsed.text}</span>
            </div>
          </div>

          {/* Row 2: Customer Info + Order Clock Time + Selected Indicator */}
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <p className="text-[#504440] font-semibold truncate min-w-0 flex-1">
              {order.user?.fullName || order.user?.email || "Khách vãng lai"}
              {order.user?.phone ? ` • ${order.user.phone}` : ""}
            </p>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-[10px] font-bold text-[#827470] bg-[#FAF7F4] px-2 py-0.5 rounded-md border border-[#ECE3DA]">
                Lúc {elapsed.clockTime}
              </span>
              {isSelected && (
                <span className="px-1.5 py-0.5 rounded-md bg-[#2C1810] text-[#FEBC85] text-[9px] font-bold uppercase">
                  Đang mở
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Items List with Inline BOM Recipe Pills */}
        <div className="flex flex-col gap-2.5">
          {(order.items || []).map((item) => {
            const itemSize = (item.size || "M").toUpperCase();
            const displayName =
              item.productName ||
              item.product?.name ||
              `Sản phẩm #${item.productId}`;
            const parsedToppings = parseToppingsList(item.toppings);
            const recipeList = item.recipeBreakdown || [];
            const toppingList = item.toppingBreakdown || [];

            return (
              <div
                key={item.id}
                className="p-3 rounded-xl bg-[#FAF7F4] border border-[#ECE3DA] flex flex-col gap-2"
              >
                {/* Item Title & Size */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#2C1810] text-[#FEBC85] font-mono text-xs font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                      {item.quantity}x
                    </span>
                    <div>
                      <h4 className="font-bold text-[14px] text-[#1D1B19] leading-snug">
                        {displayName}
                      </h4>
                      <div className="flex flex-wrap items-center gap-1 mt-1">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-[#D8C8B8] text-[10px] font-extrabold text-[#2C1810]">
                          Size {itemSize}
                        </span>
                        {parsedToppings.map((top, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FED7AA] text-[10px] font-bold text-[#9A3412]"
                          >
                            + {top}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Inline BOM Recipe Pills (Always visible at a glance!) */}
                {(recipeList.length > 0 || toppingList.length > 0) && (
                  <div className="pt-1.5 border-t border-[#E6DCD2]/70 flex flex-wrap gap-1">
                    {recipeList.map((r, rIdx) => (
                      <span
                        key={rIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#E2D6CB] text-[10px] text-[#504440] font-medium"
                      >
                        <strong className="font-mono font-bold text-[#2C1810]">
                          {r.totalAmount}
                          {r.unit}
                        </strong>{" "}
                        <span className="truncate max-w-[125px]">
                          {r.ingredientName}
                        </span>
                      </span>
                    ))}
                    {toppingList.map((t, tIdx) => (
                      <span
                        key={`t-${tIdx}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FED7AA] text-[10px] text-[#9A3412] font-semibold"
                      >
                        <strong className="font-mono font-bold">
                          +{t.totalAmount}
                          {t.unit}
                        </strong>{" "}
                        <span className="truncate max-w-[120px]">
                          {t.ingredientName}
                        </span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Customer Note Callout */}
                {item.notes && (
                  <div className="px-2.5 py-1.5 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] text-[11px] text-[#92400E] font-semibold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-xs">
                      sticky_note_2
                    </span>
                    <span>Ghi chú: {item.notes}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Action Buttons Footer */}
        <div
          className="flex items-center gap-2 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            disabled={isUpdating}
            onClick={primaryAction.onClick}
            className={`flex-1 py-2.5 px-3.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50 ${primaryAction.btnClass}`}
          >
            <span className="material-symbols-outlined text-base">
              {primaryAction.icon}
            </span>
            <span>{isUpdating ? "Đang xử lý..." : primaryAction.label}</span>
          </button>

          {onCancel && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={onCancel}
              className="p-2.5 rounded-xl bg-[#FEF2F2] hover:bg-[#991B1B] text-[#991B1B] hover:text-white border border-[#FECACA] transition-all cursor-pointer"
              title="Hủy đơn & Tự động hoàn trả nguyên liệu vào kho"
            >
              <span className="material-symbols-outlined text-base">
                cancel
              </span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Subcomponent: Interactive Preparation Workbench Panel ──────────────────

function PreparationWorkbenchPanel({
  order,
  elapsed,
  checkedSteps,
  onToggleStep,
  isUpdating,
  onTransition,
  onClose,
}: {
  order: BaristaOrder | null;
  elapsed: {
    text: string;
    clockTime: string;
    mins: number;
    level: "normal" | "warning" | "urgent";
    badgeClass: string;
  } | null;
  checkedSteps: Record<string, boolean>;
  onToggleStep: (key: string) => void;
  isUpdating: boolean;
  onTransition: (
    orderId: number,
    nextStatus: "PREPARING" | "READY" | "COMPLETED" | "CANCELLED"
  ) => void;
  onClose: () => void;
}) {
  if (!order) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[420px] text-[#827470]">
        <div className="w-14 h-14 rounded-2xl bg-[#F6F1EC] flex items-center justify-center text-[#845326] mb-3">
          <span className="material-symbols-outlined text-3xl">
            coffee_maker
          </span>
        </div>
        <h3 className="font-headline font-bold text-base text-[#2C1810]">
          Bàn Pha Chế Chi Tiết Đang Trống
        </h3>
        <p className="text-xs mt-1 max-w-xs leading-relaxed">
          Bấm vào bất kỳ thẻ đơn hàng nào bên trái để mở bảng hướng dẫn đong
          nguyên liệu từng bước (Checklist BOM).
        </p>
      </div>
    );
  }

  // Aggregate total ingredients across all items in this order
  const aggregatedMap = new Map<
    string,
    { name: string; unit: string; total: number }
  >();

  (order.items || []).forEach((it) => {
    (it.recipeBreakdown || []).forEach((r) => {
      const key = `${r.ingredientName}__${r.unit}`;
      const prev = aggregatedMap.get(key);
      aggregatedMap.set(key, {
        name: r.ingredientName,
        unit: r.unit,
        total: Number(((prev?.total || 0) + r.totalAmount).toFixed(2)),
      });
    });
    (it.toppingBreakdown || []).forEach((t) => {
      const key = `${t.ingredientName}__${t.unit}`;
      const prev = aggregatedMap.get(key);
      aggregatedMap.set(key, {
        name: t.ingredientName,
        unit: t.unit,
        total: Number(((prev?.total || 0) + t.totalAmount).toFixed(2)),
      });
    });
  });

  const aggregatedList = Array.from(aggregatedMap.values());

  // Calculate checklist completion progress for this order
  const allStepKeys: string[] = [];
  (order.items || []).forEach((it) => {
    (it.recipeBreakdown || []).forEach((_, idx) => {
      allStepKeys.push(`${order.id}-${it.id}-r-${idx}`);
    });
    (it.toppingBreakdown || []).forEach((_, idx) => {
      allStepKeys.push(`${order.id}-${it.id}-t-${idx}`);
    });
  });
  const completedStepCount = allStepKeys.filter((k) => checkedSteps[k]).length;
  const progressPct =
    allStepKeys.length > 0
      ? Math.round((completedStepCount / allStepKeys.length) * 100)
      : 100;

  return (
    <div className="flex flex-col max-h-[82vh]">
      {/* Workbench Header */}
      <div className="p-4 bg-[#2C1810] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#FEBC85] text-[#2C1810] flex items-center justify-center font-mono font-extrabold text-sm">
            #{order.id}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-bold text-base leading-none">
                Bàn Pha Chế • Đơn #BL-{order.id}
              </h3>
            </div>
            <p className="text-[11px] text-[#E3BFB2] mt-1 leading-none">
              {order.user?.fullName || order.user?.email || "Khách vãng lai"}
              {order.user?.phone ? ` • ${order.user.phone}` : ""}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xs cursor-pointer"
          title="Thu gọn Bàn Pha Chế"
        >
          ✕
        </button>
      </div>

      {/* 3-Step Visual Status Bar & Unobscured Time Strip */}
      <div className="px-4 py-3 bg-[#FAF7F4] border-b border-[#E6DCD2] flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <span
              className={`px-2 py-1 rounded-lg ${
                order.status === "PAID"
                  ? "bg-[#D97736] text-white shadow-xs"
                  : "bg-[#E6DCD2] text-[#504440]"
              }`}
            >
              1. PAID
            </span>
            <span className="text-[#827470]">→</span>
            <span
              className={`px-2 py-1 rounded-lg ${
                order.status === "PREPARING"
                  ? "bg-[#845326] text-white shadow-xs"
                  : "bg-[#E6DCD2] text-[#504440]"
              }`}
            >
              2. PREP
            </span>
            <span className="text-[#827470]">→</span>
            <span
              className={`px-2 py-1 rounded-lg ${
                order.status === "READY"
                  ? "bg-[#2D6A4F] text-white shadow-xs"
                  : "bg-[#E6DCD2] text-[#504440]"
              }`}
            >
              3. READY
            </span>
          </div>

          {elapsed && (
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="font-mono text-[10px] font-bold text-[#827470] bg-white px-2 py-0.5 rounded-md border border-[#E2D6CB]">
                Lúc {elapsed.clockTime}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-extrabold whitespace-nowrap ${elapsed.badgeClass}`}
              >
                ⏱ {elapsed.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-4">
        {/* Progress Bar for Ingredient Checklist */}
        {allStepKeys.length > 0 && (
          <div className="p-3 rounded-2xl bg-[#F6F1EC] border border-[#E2D6CB] flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#2C1810] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-base text-[#2D6A4F]">
                  checklist
                </span>
                Tiến độ đong nguyên liệu
              </span>
              <span className="font-mono font-extrabold text-[#2D6A4F]">
                {completedStepCount}/{allStepKeys.length} bước ({progressPct}%)
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-[#E2D6CB] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#2D6A4F] to-[#52B788] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Aggregated Batch Ingredients Box */}
        {aggregatedList.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#E6DCD2]">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#845326] flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-sm">
                scale
              </span>
              Tổng nguyên liệu cần chuẩn bị cho cả đơn
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {aggregatedList.map((agg, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1.5 rounded-xl bg-[#F6F1EC] flex items-center justify-between text-[11px]"
                >
                  <span className="text-[#504440] truncate pr-1">
                    {agg.name}
                  </span>
                  <span className="font-mono font-extrabold text-[#2C1810] shrink-0">
                    {agg.total} {agg.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step-by-Step Interactive Recipe Checklist per Item */}
        <div className="flex flex-col gap-3">
          {(order.items || []).map((item, itemIdx) => {
            const itemSize = (item.size || "M").toUpperCase();
            const displayName =
              item.productName ||
              item.product?.name ||
              `Sản phẩm #${item.productId}`;
            const parsedToppings = parseToppingsList(item.toppings);
            const recipeList = item.recipeBreakdown || [];
            const toppingList = item.toppingBreakdown || [];

            return (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-white border border-[#E2D6CB] shadow-2xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between border-b border-[#F0E9E2] pb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#2C1810] text-[#FEBC85] font-mono text-xs font-extrabold">
                      Món #{itemIdx + 1} ({item.quantity}x)
                    </span>
                    <h4 className="font-bold text-sm text-[#2C1810]">
                      {displayName}
                    </h4>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#F6F1EC] font-mono text-xs font-extrabold text-[#845326]">
                    Size {itemSize}
                  </span>
                </div>

                {parsedToppings.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {parsedToppings.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FED7AA] text-[11px] font-bold text-[#9A3412]"
                      >
                        + Topping: {t}
                      </span>
                    ))}
                  </div>
                )}

                {/* Checkable Ingredient Steps */}
                <div className="flex flex-col gap-1.5">
                  {recipeList.map((r, rIdx) => {
                    const stepKey = `${order.id}-${item.id}-r-${rIdx}`;
                    const isChecked = Boolean(checkedSteps[stepKey]);
                    return (
                      <button
                        key={stepKey}
                        type="button"
                        onClick={() => onToggleStep(stepKey)}
                        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#2D6A4F]"
                            : "bg-[#FAF7F4] hover:bg-[#F3EDE8] border-[#E6DCD2] text-[#1D1B19]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="material-symbols-outlined text-base">
                            {isChecked
                              ? "check_box"
                              : "check_box_outline_blank"}
                          </span>
                          <span
                            className={`text-xs font-semibold truncate ${
                              isChecked ? "line-through opacity-75" : ""
                            }`}
                          >
                            {r.ingredientName}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-extrabold shrink-0 ml-2">
                          {r.totalAmount} {r.unit}
                        </span>
                      </button>
                    );
                  })}

                  {toppingList.map((t, tIdx) => {
                    const stepKey = `${order.id}-${item.id}-t-${tIdx}`;
                    const isChecked = Boolean(checkedSteps[stepKey]);
                    return (
                      <button
                        key={stepKey}
                        type="button"
                        onClick={() => onToggleStep(stepKey)}
                        className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isChecked
                            ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#2D6A4F]"
                            : "bg-[#FFF7ED] hover:bg-[#FFEDD5] border-[#FED7AA] text-[#9A3412]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="material-symbols-outlined text-base">
                            {isChecked
                              ? "check_box"
                              : "check_box_outline_blank"}
                          </span>
                          <span
                            className={`text-xs font-bold truncate ${
                              isChecked ? "line-through opacity-75" : ""
                            }`}
                          >
                            + {t.ingredientName}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-extrabold shrink-0 ml-2">
                          {t.totalAmount} {t.unit}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {item.notes && (
                  <div className="p-2.5 rounded-xl bg-[#FEF3C7] border border-[#FDE68A] text-xs text-[#92400E] font-semibold">
                    📝 Ghi chú khách: {item.notes}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Workbench Sticky Action Footer */}
      <div className="p-4 bg-[#FAF7F4] border-t border-[#E6DCD2] flex items-center gap-2">
        {order.status === "PAID" && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onTransition(order.id, "PREPARING")}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2C1810] hover:bg-[#3F2418] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              play_arrow
            </span>
            <span>Nhận đơn &amp; Bắt đầu pha (PREPARING)</span>
          </button>
        )}

        {order.status === "PREPARING" && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onTransition(order.id, "READY")}
            className="flex-1 py-3 px-4 rounded-xl bg-[#D97736] hover:bg-[#C26225] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              notifications_active
            </span>
            <span>Pha xong • Gọi khách nhận món (READY)</span>
          </button>
        )}

        {order.status === "READY" && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onTransition(order.id, "COMPLETED")}
            className="flex-1 py-3 px-4 rounded-xl bg-[#2D6A4F] hover:bg-[#23533D] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-base">
              task_alt
            </span>
            <span>Hoàn tất giao khách (COMPLETED)</span>
          </button>
        )}

        {(order.status === "PAID" || order.status === "PREPARING") && (
          <button
            type="button"
            disabled={isUpdating}
            onClick={() => onTransition(order.id, "CANCELLED")}
            className="px-3.5 py-3 rounded-xl bg-[#FEF2F2] hover:bg-[#991B1B] text-[#991B1B] hover:text-white border border-[#FECACA] font-bold text-xs flex items-center gap-1 transition-all cursor-pointer"
            title="Hủy đơn & Hoàn trả nguyên liệu vào kho"
          >
            <span className="material-symbols-outlined text-base">cancel</span>
            <span>Hủy</span>
          </button>
        )}
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BrewLiteLogo from "../components/BrewLiteLogo";
import { useAuthStore, apiFetch } from "../store/authStore";

interface Ingredient {
  id: number;
  code: string;
  name: string;
  unit: string;
  stock: number;
  minThreshold: number;
  version: number;
  status: "OK" | "LOW_STOCK" | "OUT_OF_STOCK";
  percentage: number;
}

interface RecipeEntry {
  id: number;
  size: string;
  amount: number;
  ingredient: Ingredient;
}

interface ProductWithRecipes {
  id: number;
  name: string;
  basePrice: number;
  imageUrl?: string | null;
  availableServings?: number;
  isOutOfStock?: boolean;
  recipes: RecipeEntry[];
}

interface ToppingRecipeEntry {
  id: number;
  toppingId?: string;
  toppingCode?: string;
  toppingName: string;
  amount: number;
  ingredient: Ingredient;
}

interface OrderSummary {
  id: number;
  status: string;
  totalAmount: number;
  discountAmount?: number;
  createdAt: string;
  user?: {
    fullName: string | null;
    email: string;
  };
}

type AdminTab = "overview" | "inventory" | "recipes" | "revenue";

export default function AdminPortalPage() {
  const router = useRouter();
  const { user, isAuthenticated, _hasHydrated, logout } = useAuthStore();

  const [activeTab, setActiveTab] = useState<AdminTab>("inventory");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [productsRecipes, setProductsRecipes] = useState<ProductWithRecipes[]>(
    []
  );
  const [toppingRecipes, setToppingRecipes] = useState<ToppingRecipeEntry[]>(
    []
  );
  const [allOrders, setAllOrders] = useState<OrderSummary[]>([]);
  const [dashboardRevenue, setDashboardRevenue] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filter & Search for Inventory Bento Grid
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [stockFilter, setStockFilter] = useState<
    "all" | "low" | "pastry" | "beverage"
  >("all");

  // Restock / Edit Stock Modal
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [modalMode, setModalMode] = useState<"restock" | "set">("restock");
  const [amountInput, setAmountInput] = useState<string>("500");
  const [noteInput, setNoteInput] = useState<string>(
    "Nhập hàng định kỳ ca sáng"
  );
  const [isSubmittingModal, setIsSubmittingModal] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Auth & Role Guard
  useEffect(() => {
    if (_hasHydrated) {
      if (!isAuthenticated || !user) {
        router.replace("/login?redirect=/admin");
      } else if (user.role !== "ADMIN") {
        router.replace(user.role === "STAFF" ? "/staff" : "/menu");
      }
    }
  }, [_hasHydrated, isAuthenticated, user, router]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const fetchAdminData = useCallback(async () => {
    if (!_hasHydrated || !isAuthenticated || user?.role !== "ADMIN") return;
    setIsLoading(true);
    try {
      const [ingRes, recRes, prodRes, dashRes] = await Promise.all([
        apiFetch("/inventory/ingredients", { cache: "no-store" }),
        apiFetch("/inventory/recipes", { cache: "no-store" }),
        apiFetch("/products", { cache: "no-store" }),
        apiFetch("/inventory/dashboard", { cache: "no-store" }),
      ]);

      if (ingRes.ok) {
        const ingData = await ingRes.json();
        setIngredients(Array.isArray(ingData) ? ingData : []);
      }

      const prodList: ProductWithRecipes[] = prodRes.ok
        ? await prodRes.json()
        : [];

      if (recRes.ok) {
        const recData = await recRes.json();
        const rawProducts: ProductWithRecipes[] = Array.isArray(
          recData?.products
        )
          ? recData.products
          : [];
        // Merge availableServings & isOutOfStock from /products
        const merged = rawProducts.map((rp) => {
          const match = prodList.find((p) => p.id === rp.id);
          return {
            ...rp,
            availableServings: match?.availableServings ?? 0,
            isOutOfStock: match?.isOutOfStock ?? false,
          };
        });
        setProductsRecipes(merged);
        setToppingRecipes(
          Array.isArray(recData?.toppingRecipes) ? recData.toppingRecipes : []
        );
      }

      if (dashRes.ok) {
        const dashData = await dashRes.json();
        setDashboardRevenue(dashData?.totalRevenue ?? 0);
        setAllOrders(
          Array.isArray(dashData?.recentOrders) ? dashData.recentOrders : []
        );
      }
    } catch {
      showToast("Không thể tải dữ liệu kho từ máy chủ");
    } finally {
      setIsLoading(false);
    }
  }, [_hasHydrated, isAuthenticated, user]);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  const openRestockModal = (ing: Ingredient, mode: "restock" | "set") => {
    setSelectedIngredient(ing);
    setModalMode(mode);
    if (mode === "restock") {
      setAmountInput(
        ing.unit === "g" || ing.unit === "ml" ? "1000" : "20"
      );
      setNoteInput("Nhập kho bổ sung");
    } else {
      setAmountInput(String(ing.stock));
      setNoteInput("Kiểm kê điều chỉnh tồn kho thực tế");
    }
  };

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIngredient) return;
    const numericVal = Number(amountInput);
    if (isNaN(numericVal) || numericVal < 0) {
      showToast("Số lượng không hợp lệ");
      return;
    }

    setIsSubmittingModal(true);
    try {
      if (modalMode === "restock") {
        const res = await apiFetch(
          `/inventory/ingredients/${selectedIngredient.id}/restock`,
          {
            method: "PATCH",
            body: JSON.stringify({ addAmount: numericVal }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Lỗi nhập kho");
        }
        showToast(
          `✅ Đã nhập thêm +${numericVal.toLocaleString("vi-VN")} ${selectedIngredient.unit} cho ${selectedIngredient.name}`
        );
      } else {
        const res = await apiFetch(
          `/inventory/ingredients/${selectedIngredient.id}/stock`,
          {
            method: "PATCH",
            body: JSON.stringify({ stock: numericVal }),
          }
        );
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || "Lỗi cập nhật tồn kho");
        }
        showToast(
          `✅ Đã đặt mức tồn kho ${selectedIngredient.name} = ${numericVal.toLocaleString("vi-VN")} ${selectedIngredient.unit}`
        );
      }
      setSelectedIngredient(null);
      await fetchAdminData();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : "Đã xảy ra lỗi");
    } finally {
      setIsSubmittingModal(false);
    }
  };

  // Summary KPIs
  const totalIngredients = ingredients.length;
  const lowStockCount = ingredients.filter(
    (i) => i.status === "LOW_STOCK" || i.status === "OUT_OF_STOCK"
  ).length;
  const outOfStockProductsCount = productsRecipes.filter(
    (p) => p.isOutOfStock
  ).length;
  const healthyIngredientsCount = ingredients.filter(
    (i) => i.status === "OK"
  ).length;

  // Filtered Ingredients for Bento Grid
  const filteredIngredients = ingredients.filter((ing) => {
    const matchSearch =
      !searchQuery.trim() ||
      ing.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.code.toLowerCase().includes(searchQuery.toLowerCase());

    const isPastryUnit = ["chiếc", "lát", "phần"].includes(ing.unit);
    const isLow = ing.status === "LOW_STOCK" || ing.status === "OUT_OF_STOCK";
    if (stockFilter === "low") return matchSearch && isLow;
    if (stockFilter === "pastry") return matchSearch && isPastryUnit;
    if (stockFilter === "beverage") return matchSearch && !isPastryUnit;
    return matchSearch;
  });

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-[#F5EFEB] flex items-center justify-center font-body text-[#2C1810]">
        Đang khởi tạo hệ thống Quản trị Kho ERP...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5EFEB] text-[#1D1B19] flex font-body selection:bg-[#FEBC85] selection:text-[#2C1810]">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-2xl bg-[#2C1810] text-[#FEF8F4] shadow-[8px_8px_20px_#D5C9C0] flex items-center gap-3 animate-fadeIn">
          <span className="material-symbols-outlined text-[#FEBC85]">
            inventory
          </span>
          <span className="text-[13px] font-semibold">{toastMsg}</span>
        </div>
      )}

      {/* ── LEFT COLLAPSIBLE NEUMORPHIC SIDEBAR ── */}
      <aside
        className={`sticky top-0 h-screen bg-[#F5EFEB] border-r border-white/60 shadow-[6px_0_16px_rgba(217,206,197,0.45)] flex flex-col justify-between p-4 transition-all duration-300 z-30 ${
          sidebarCollapsed ? "w-20" : "w-68"
        }`}
      >
        <div className="flex flex-col gap-6">
          {/* Logo & Collapse Button */}
          <div className="flex items-center justify-between px-2 pt-1">
            {!sidebarCollapsed && (
              <Link href="/menu" className="flex items-center">
                <BrewLiteLogo className="h-8 w-auto" />
              </Link>
            )}
            <button
              type="button"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-10 h-10 rounded-2xl bg-[#F8F2EE] shadow-[4px_4px_8px_#D9CEC5,-4px_-4px_8px_#FFFFFF] border border-white/60 flex items-center justify-center text-[#2C1810] hover:text-[#845326] transition-all cursor-pointer"
              title={sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
            >
              <span className="material-symbols-outlined text-lg">
                {sidebarCollapsed ? "menu_open" : "dock_to_right"}
              </span>
            </button>
          </div>

          {/* Admin Role Badge */}
          {!sidebarCollapsed && (
            <div className="p-3.5 rounded-2xl bg-[#EDE4DC] shadow-[inset_4px_4px_8px_#D5C9C0,inset_-4px_-4px_8px_#FFFFFF] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2C1810] text-[#FEBC85] flex items-center justify-center font-bold text-sm shrink-0">
                AD
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#2C1810] truncate">
                  {user?.fullName || "Store Manager"}
                </p>
                <p className="text-[11px] text-[#845326] font-semibold truncate">
                  Quản trị Kho & Định lượng
                </p>
              </div>
            </div>
          )}

          {/* Navigation Items */}
          <nav className="flex flex-col gap-2.5">
            {[
              {
                id: "overview" as AdminTab,
                label: "Tổng quan ERP",
                icon: "space_dashboard",
              },
              {
                id: "inventory" as AdminTab,
                label: "Kho nguyên liệu",
                icon: "inventory_2",
                badge: lowStockCount > 0 ? lowStockCount : undefined,
              },
              {
                id: "recipes" as AdminTab,
                label: "Công thức định lượng",
                icon: "science",
              },
              {
                id: "revenue" as AdminTab,
                label: "Doanh thu & Đơn hàng",
                icon: "monitoring",
              },
            ].map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full p-3.5 rounded-2xl flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? "bg-[#EDE4DC] text-[#2C1810] font-bold shadow-[inset_4px_4px_8px_#D5C9C0,inset_-4px_-4px_8px_#FFFFFF] border-l-4 border-[#845326]"
                      : "bg-[#F8F2EE] text-[#504440] font-semibold shadow-[5px_5px_10px_#D9CEC5,-5px_-5px_10px_#FFFFFF] hover:text-[#2C1810]"
                  }`}
                  title={item.label}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`material-symbols-outlined text-xl ${
                        isActive ? "text-[#845326]" : "text-[#504440]"
                      }`}
                    >
                      {item.icon}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="text-[13px]">{item.label}</span>
                    )}
                  </div>
                  {!sidebarCollapsed && item.badge !== undefined && (
                    <span className="px-2 py-0.5 rounded-full bg-[#991B1B] text-white text-[10px] font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Quick Switchers */}
        <div className="flex flex-col gap-2 pt-4 border-t border-[#2C1810]/10">
          <Link
            href="/staff"
            className="w-full p-3 rounded-2xl bg-[#F8F2EE] shadow-[4px_4px_8px_#D9CEC5,-4px_-4px_8px_#FFFFFF] text-[#D97736] font-bold text-xs flex items-center gap-2.5 hover:bg-[#EDE4DC] transition-all"
            title="Mở màn hình Barista KDS"
          >
            <span className="material-symbols-outlined text-lg">
              coffee_maker
            </span>
            {!sidebarCollapsed && <span>Màn hình Barista KDS</span>}
          </Link>

          <Link
            href="/menu"
            className="w-full p-3 rounded-2xl bg-[#F8F2EE] shadow-[4px_4px_8px_#D9CEC5,-4px_-4px_8px_#FFFFFF] text-[#504440] font-bold text-xs flex items-center gap-2.5 hover:text-[#2C1810] transition-all"
            title="Về trang Thực đơn khách hàng"
          >
            <span className="material-symbols-outlined text-lg">
              storefront
            </span>
            {!sidebarCollapsed && <span>Thực đơn Khách hàng</span>}
          </Link>

          <button
            type="button"
            onClick={() => {
              logout();
              router.push("/login");
            }}
            className="w-full p-3 rounded-2xl bg-[#F8F2EE] shadow-[4px_4px_8px_#D9CEC5,-4px_-4px_8px_#FFFFFF] text-[#991B1B] font-bold text-xs flex items-center gap-2.5 hover:bg-[#991B1B] hover:text-white transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg">logout</span>
            {!sidebarCollapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT AREA ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-[#F5EFEB]/90 backdrop-blur-md px-6 md:px-10 py-4 border-b border-white/60 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-headline text-[24px] md:text-[28px] font-bold text-[#2C1810] leading-tight">
              {activeTab === "overview" && "Tổng quan Vận hành & Tồn kho ERP"}
              {activeTab === "inventory" &&
                "Kiểm soát Kho Nguyên Vật Liệu (Bento Grid)"}
              {activeTab === "recipes" &&
                "Ma trận Công thức Định lượng (BOM Recipe Engine)"}
              {activeTab === "revenue" && "Báo cáo Doanh thu & Lịch sử Đơn hàng"}
            </h1>
            <p className="text-xs text-[#504440] mt-0.5">
              Cơ chế trừ kho tự động theo định lượng S/M/L với khóa lạc quan
              (Optimistic Locking) chống xuất âm kho.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={fetchAdminData}
              className="px-4 py-2.5 rounded-2xl bg-[#F8F2EE] shadow-[5px_5px_10px_#D9CEC5,-5px_-5px_10px_#FFFFFF] border border-white/60 text-xs font-bold text-[#2C1810] flex items-center gap-1.5 hover:text-[#845326] active:scale-95 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">
                refresh
              </span>
              <span>Làm mới dữ liệu</span>
            </button>
          </div>
        </header>

        <main className="p-6 md:p-10 flex flex-col gap-8 max-w-[1600px] w-full mx-auto">
          {/* ── 4 TOP NEUMORPHIC KPI SUMMARY CARDS ── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <div className="p-5 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#827470]">
                  Tổng mặt hàng nguyên liệu
                </span>
                <p className="font-mono text-[28px] font-extrabold text-[#2C1810] mt-1">
                  {totalIngredients}
                </p>
                <span className="text-[11px] text-[#2D6A4F] font-semibold">
                  12 pha chế • 3 bánh ngọt
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] flex items-center justify-center text-[#845326]">
                <span className="material-symbols-outlined text-2xl">
                  inventory_2
                </span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#827470]">
                  Cảnh báo sắp hết kho
                </span>
                <p
                  className={`font-mono text-[28px] font-extrabold mt-1 ${
                    lowStockCount > 0 ? "text-[#991B1B]" : "text-[#2D6A4F]"
                  }`}
                >
                  {lowStockCount}
                </p>
                <span className="text-[11px] text-[#504440] font-semibold">
                  {outOfStockProductsCount > 0
                    ? `${outOfStockProductsCount} món trên Menu bị khóa`
                    : "100% món trên Menu đủ bán"}
                </span>
              </div>
              <div
                className={`w-12 h-12 rounded-2xl bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] flex items-center justify-center ${
                  lowStockCount > 0 ? "text-[#991B1B]" : "text-[#2D6A4F]"
                }`}
              >
                <span className="material-symbols-outlined text-2xl">
                  {lowStockCount > 0 ? "warning" : "verified"}
                </span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#827470]">
                  Nguyên liệu đạt chuẩn
                </span>
                <p className="font-mono text-[28px] font-extrabold text-[#2D6A4F] mt-1">
                  {healthyIngredientsCount}/{totalIngredients}
                </p>
                <span className="text-[11px] text-[#845326] font-semibold">
                  Đảm bảo định mức an toàn
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] flex items-center justify-center text-[#D97736]">
                <span className="material-symbols-outlined text-2xl">
                  fact_check
                </span>
              </div>
            </div>

            <div className="p-5 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#827470]">
                  Doanh thu thực thu
                </span>
                <p className="font-mono text-[24px] font-extrabold text-[#2D6A4F] mt-1">
                  {dashboardRevenue.toLocaleString("vi-VN")}đ
                </p>
                <span className="text-[11px] text-[#504440] font-semibold">
                  {allOrders.length} đơn gần nhất
                </span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] flex items-center justify-center text-[#2D6A4F]">
                <span className="material-symbols-outlined text-2xl">
                  payments
                </span>
              </div>
            </div>
          </section>

          {/* ── TAB 1 & 2: INVENTORY BENTO GRID CARDS ── */}
          {(activeTab === "inventory" || activeTab === "overview") && (
            <section className="flex flex-col gap-5">
              {/* Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#EDE4DC] shadow-[inset_4px_4px_8px_#D5C9C0,inset_-4px_-4px_8px_#FFFFFF]">
                  {[
                    { id: "all", label: "Tất cả (15)" },
                    {
                      id: "low",
                      label: `Sắp hết (${lowStockCount})`,
                    },
                    { id: "beverage", label: "Nguyên liệu Pha chế (12)" },
                    { id: "pastry", label: "Bánh ngọt nhập sẵn (3)" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() =>
                        setStockFilter(
                          tab.id as "all" | "low" | "pastry" | "beverage"
                        )
                      }
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        stockFilter === tab.id
                          ? "bg-[#2C1810] text-white shadow-sm"
                          : "text-[#504440] hover:text-[#2C1810]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#EDE4DC] shadow-[inset_4px_4px_8px_#D5C9C0,inset_-4px_-4px_8px_#FFFFFF] w-full sm:w-80">
                  <span className="material-symbols-outlined text-base text-[#845326]">
                    search
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm tên nguyên liệu hoặc mã..."
                    className="bg-transparent text-xs text-[#1D1B19] placeholder:text-[#827470] focus:outline-none w-full font-body"
                  />
                </div>
              </div>

              {/* Bento Grid */}
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <div
                      key={n}
                      className="h-56 rounded-3xl bg-[#EDE4DC] animate-pulse"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredIngredients.map((ing) => {
                    const minThresh = ing.minThreshold ?? 100;
                    const maxCap = Math.max(minThresh * 5, ing.stock, 1);
                    const pct = Math.min(
                      100,
                      Math.max(4, Math.round((ing.stock / maxCap) * 100))
                    );

                    // 3-Tier Semantic Color Thresholds
                    const isDanger = ing.stock <= minThresh;
                    const isWarning = !isDanger && ing.stock <= minThresh * 2;

                    const barColor = isDanger
                      ? "from-[#991B1B] to-[#DC2626]"
                      : isWarning
                      ? "from-[#D97736] to-[#FEBC85]"
                      : "from-[#2D6A4F] to-[#52B788]";

                    const statusBadge = isDanger
                      ? {
                          label:
                            ing.stock <= 0 ? "HẾT KHO (0)" : "CẦN NHẬP GẤP",
                          cls: "bg-[#991B1B]/15 text-[#991B1B] border border-[#991B1B]/30",
                        }
                      : isWarning
                      ? {
                          label: "SẮP CHẠM ĐÁY",
                          cls: "bg-[#D97736]/20 text-[#845326] border border-[#D97736]/40",
                        }
                      : {
                          label: "AN TOÀN",
                          cls: "bg-[#2D6A4F]/15 text-[#2D6A4F] border border-[#2D6A4F]/30",
                        };

                    return (
                      <article
                        key={ing.id}
                        className="p-6 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70 flex flex-col justify-between gap-4 transition-all hover:-translate-y-0.5"
                      >
                        {/* Top Row: Code + Name + Status Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-[#EDE4DC] text-[#845326]">
                              {ing.code}
                            </span>
                            <h3 className="font-headline font-bold text-[18px] text-[#2C1810] mt-1.5 leading-snug">
                              {ing.name}
                            </h3>
                          </div>
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${statusBadge.cls}`}
                          >
                            {statusBadge.label}
                          </span>
                        </div>

                        {/* Middle Row: Big Stock Metric & Recessed Groove Progress Bar */}
                        <div className="flex flex-col gap-2">
                          <div className="flex items-baseline justify-between">
                            <div className="flex items-baseline gap-1.5">
                              <span className="font-mono text-[28px] font-extrabold text-[#2C1810]">
                                {ing.stock.toLocaleString("vi-VN")}
                              </span>
                              <span className="text-sm font-bold text-[#845326]">
                                {ing.unit}
                              </span>
                            </div>
                            <span className="text-[11px] text-[#827470] font-mono">
                              Định mức tối thiểu:{" "}
                              <strong>
                                {minThresh.toLocaleString("vi-VN")} {ing.unit}
                              </strong>
                            </span>
                          </div>

                          {/* Recessed Neumorphic Groove Bar */}
                          <div className="w-full h-3.5 rounded-full bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] p-0.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Bottom Row: Action Buttons */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#2C1810]/10">
                          <button
                            type="button"
                            onClick={() => openRestockModal(ing, "set")}
                            className="px-3 py-2 rounded-xl bg-[#EDE4DC] hover:bg-[#D5C9C0]/60 text-[#504440] text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer"
                            title="Điều chỉnh số lượng tồn thực tế (Hoặc chỉnh về 0 để test Hết hàng trên Menu)"
                          >
                            <span className="material-symbols-outlined text-sm">
                              tune
                            </span>
                            <span>Kiểm kê / Sửa</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => openRestockModal(ing, "restock")}
                            className="px-4 py-2 rounded-xl bg-gradient-to-br from-[#3A2218] to-[#2C1810] text-[#FEF8F4] shadow-[4px_4px_8px_#C8BCB2,-2px_-2px_6px_#FFFFFF] text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-sm text-[#FEBC85]">
                              add_circle
                            </span>
                            <span>+ Nhập thêm kho</span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── TAB 3: BOM RECIPE MATRIX (CÔNG THỨC ĐỊNH LƯỢNG) ── */}
          {activeTab === "recipes" && (
            <section className="flex flex-col gap-6">
              <div className="p-6 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <div>
                    <h2 className="font-headline text-[20px] font-bold text-[#2C1810]">
                      Bảng Định Lượng 10 Sản Phẩm (Tự động quy đổi Size S / M / L)
                    </h2>
                    <p className="text-xs text-[#504440]">
                      Số ly/phần khả dụng được tính real-time từ tồn kho nguyên
                      liệu thấp nhất trong công thức.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {productsRecipes.map((prod) => {
                    const sizes = Array.from(
                      new Set(prod.recipes.map((r) => r.size))
                    );
                    return (
                      <div
                        key={prod.id}
                        className="p-5 rounded-2xl bg-[#EDE4DC]/60 shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] flex flex-col gap-3"
                      >
                        <div className="flex items-center justify-between border-b border-[#2C1810]/10 pb-2.5">
                          <div>
                            <h3 className="font-headline font-bold text-[17px] text-[#2C1810]">
                              {prod.name}
                            </h3>
                            <span className="text-xs text-[#845326] font-semibold">
                              Giá gốc: {prod.basePrice.toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                          <div
                            className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                              prod.isOutOfStock
                                ? "bg-[#991B1B] text-white"
                                : "bg-[#2D6A4F]/15 text-[#2D6A4F]"
                            }`}
                          >
                            {prod.isOutOfStock
                              ? "HẾT NGUYÊN LIỆU (0)"
                              : `Khả dụng: ~${prod.availableServings ?? 0} phần`}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          {sizes.map((sz) => {
                            const itemsForSize = prod.recipes.filter(
                              (r) => r.size === sz
                            );
                            return (
                              <div
                                key={sz}
                                className="p-3 rounded-xl bg-[#F8F2EE] shadow-xs flex flex-col gap-1.5"
                              >
                                <span className="text-[11px] font-bold uppercase tracking-wider text-[#845326] border-b border-[#2C1810]/10 pb-1">
                                  {sz === "ALL"
                                    ? "Định lượng Bánh (1 phần)"
                                    : `Size ${sz}`}
                                </span>
                                {itemsForSize.map((r) => (
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
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Topping BOM Table */}
              <div className="p-6 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70">
                <h3 className="font-headline text-[18px] font-bold text-[#2C1810] mb-3">
                  Định Lượng Topping Cộng Thêm (Extra Toppings BOM)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {toppingRecipes.map((tr) => (
                    <div
                      key={tr.id}
                      className="p-4 rounded-2xl bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] flex flex-col gap-1"
                    >
                      <span className="text-[10px] font-mono font-bold uppercase text-[#845326]">
                        Mã: {tr.toppingId || tr.toppingCode}
                      </span>
                      <h4 className="font-bold text-sm text-[#2C1810]">
                        {tr.toppingName}
                      </h4>
                      <p className="text-xs text-[#504440] mt-1">
                        Trừ kho:{" "}
                        <strong className="font-mono text-[#2C1810]">
                          {tr.amount} {tr.ingredient.unit}
                        </strong>{" "}
                        ({tr.ingredient.name})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ── TAB 4: REVENUE & ORDERS LIST ── */}
          {activeTab === "revenue" && (
            <section className="p-6 rounded-3xl bg-[#F8F2EE] shadow-[8px_8px_16px_#D9CEC5,-8px_-8px_16px_#FFFFFF] border border-white/70 flex flex-col gap-4">
              <h2 className="font-headline text-[20px] font-bold text-[#2C1810]">
                Nhật ký Đơn hàng & Đối soát Doanh thu Toàn hệ thống
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2C1810]/10 text-[11px] font-bold uppercase tracking-wider text-[#827470]">
                      <th className="py-3 px-4">Mã Đơn</th>
                      <th className="py-3 px-4">Khách hàng</th>
                      <th className="py-3 px-4">Thời gian</th>
                      <th className="py-3 px-4">Trạng thái</th>
                      <th className="py-3 px-4 text-right">Giảm giá</th>
                      <th className="py-3 px-4 text-right">Tổng thanh toán</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C1810]/5 text-xs">
                    {allOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-[#EDE4DC]/40">
                        <td className="py-3 px-4 font-mono font-bold text-[#2C1810]">
                          #BL-{ord.id}
                        </td>
                        <td className="py-3 px-4 text-[#504440]">
                          {ord.user?.fullName ||
                            ord.user?.email ||
                            "Khách vãng lai"}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#827470]">
                          {new Date(ord.createdAt).toLocaleString("vi-VN")}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-[#EDE4DC] text-[#2C1810]">
                            {ord.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#845326]">
                          {(ord.discountAmount || 0).toLocaleString("vi-VN")}đ
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#2C1810]">
                          {ord.totalAmount.toLocaleString("vi-VN")}đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* ── NEUMORPHIC RESTOCK / SET STOCK MODAL ── */}
      {selectedIngredient && (
        <div className="fixed inset-0 z-50 bg-[#2C1810]/40 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="w-full max-w-md p-6 rounded-3xl bg-[#F8F2EE] shadow-[12px_12px_24px_#2C1810/20] border border-white flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#EDE4DC] text-[#845326]">
                  {selectedIngredient.code}
                </span>
                <h3 className="font-headline text-[20px] font-bold text-[#2C1810] mt-1">
                  {modalMode === "restock"
                    ? `Nhập thêm kho: ${selectedIngredient.name}`
                    : `Kiểm kê tồn kho: ${selectedIngredient.name}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIngredient(null)}
                className="w-8 h-8 rounded-full bg-[#EDE4DC] text-[#504440] flex items-center justify-center hover:text-[#2C1810] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] flex items-center justify-between text-xs">
              <span className="text-[#504440]">Tồn kho hiện tại:</span>
              <span className="font-mono font-bold text-sm text-[#2C1810]">
                {selectedIngredient.stock.toLocaleString("vi-VN")}{" "}
                {selectedIngredient.unit}
              </span>
            </div>

            <form onSubmit={handleModalSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2C1810]">
                  {modalMode === "restock"
                    ? `Số lượng nhập thêm (${selectedIngredient.unit})`
                    : `Mức tồn kho mới (${selectedIngredient.unit})`}
                </label>
                <input
                  type="number"
                  min={0}
                  step="any"
                  required
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#EDE4DC] shadow-[inset_4px_4px_8px_#D5C9C0,inset_-4px_-4px_8px_#FFFFFF] font-mono text-base font-bold text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#845326]"
                />
                {/* Quick Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {(modalMode === "restock"
                    ? ["100", "500", "1000", "5000"]
                    : [
                        "0",
                        String(selectedIngredient.minThreshold ?? 50),
                        "500",
                        "2000",
                      ]
                  ).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmountInput(preset)}
                      className="px-2.5 py-1 rounded-lg bg-[#EDE4DC] hover:bg-[#FEBC85]/40 text-[11px] font-mono font-bold text-[#504440] cursor-pointer"
                    >
                      {modalMode === "restock" ? `+${preset}` : `=${preset}`}{" "}
                      {selectedIngredient.unit}
                      {preset === "0" ? " (Test Hết hàng)" : ""}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[#2C1810]">
                  Ghi chú phiếu kho
                </label>
                <input
                  type="text"
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#EDE4DC] shadow-[inset_3px_3px_6px_#D5C9C0,inset_-3px_-3px_6px_#FFFFFF] text-xs text-[#2C1810] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedIngredient(null)}
                  className="px-4 py-2.5 rounded-2xl bg-[#EDE4DC] text-xs font-bold text-[#504440] cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingModal}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-br from-[#3A2218] to-[#2C1810] text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingModal
                    ? "Đang lưu..."
                    : modalMode === "restock"
                    ? "Xác nhận Nhập kho"
                    : "Lưu mức tồn kho"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

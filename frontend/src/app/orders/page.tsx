"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiFetch, useAuthStore } from "../store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
  unitPrice: number;
}

interface Payment {
  id: number;
  method: string;
  status: string;
  amount: number;
  createdAt: string;
}

interface Order {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  payments: Payment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "₫";

const formatDate = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const isToday =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (isToday) {
    return (
      "Hôm nay " +
      d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
    );
  }
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

// Status config
const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    badgeClass: string;
    iconBg: string;
    icon: string;
    iconClass: string;
    animated?: boolean;
  }
> = {
  PENDING: {
    label: "Chờ thanh toán",
    badgeClass:
      "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    iconBg: "bg-amber-100 text-amber-800",
    icon: "schedule",
    iconClass: "",
  },
  PAID: {
    label: "Đã thanh toán",
    badgeClass:
      "bg-[#2c1810] text-[#ffdcc2] ring-1 ring-[#2c1810]",
    iconBg: "bg-[#2c1810] text-[#ffdcc2]",
    icon: "check",
    iconClass: "",
    animated: false,
  },
  PREPARING: {
    label: "Đang pha chế",
    badgeClass:
      "bg-[#2c1810] text-[#fef8f4] ring-1 ring-[#845326]",
    iconBg: "bg-[#2c1810] text-[#febc85]",
    icon: "autorenew",
    iconClass: "animate-spin",
    animated: true,
  },
  READY: {
    label: "Sẵn sàng lấy món",
    badgeClass:
      "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-800",
    icon: "notifications_active",
    iconClass: "",
    animated: true,
  },
  COMPLETED: {
    label: "Hoàn thành",
    badgeClass: "bg-slate-100 text-slate-700",
    iconBg: "bg-slate-100 text-slate-600",
    icon: "check_circle",
    iconClass: "",
  },
  PAYMENT_FAILED: {
    label: "Thanh toán lỗi",
    badgeClass: "bg-red-100 text-red-700 ring-1 ring-red-200",
    iconBg: "bg-red-100 text-red-700",
    icon: "error_outline",
    iconClass: "",
  },
  CANCELLED: {
    label: "Đã hủy",
    badgeClass: "bg-slate-100 text-slate-500",
    iconBg: "bg-slate-100 text-slate-400",
    icon: "cancel",
    iconClass: "",
  },
};

// Active statuses for live section
const ACTIVE_STATUSES = ["PAID", "PREPARING", "READY"];

type FilterKey = "all" | "active" | "completed" | "cancelled";

function isActive(status: string) {
  return ACTIVE_STATUSES.includes(status);
}

// ── Order card component ──────────────────────────────────────────────────────

function OrderCard({ order }: { order: Order }) {
  const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG["COMPLETED"];
  const payMethod = order.payments?.[0]?.method;
  const payLabel =
    payMethod === "CARD"
      ? "Thẻ ngân hàng"
      : payMethod === "MOMO"
      ? "Ví MoMo Express"
      : payMethod
      ? payMethod
      : "Cashless";

  const isReadyStatus = order.status === "READY";
  const isActiveOrder = isActive(order.status);

  return (
    <article
      className={`bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all
        ${isReadyStatus ? "ring-1 ring-emerald-500/30" : ""}
      `}
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Left: Icon + Info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${cfg.iconBg}`}
          >
            <span
              className={`material-symbols-outlined text-2xl ${cfg.iconClass}`}
              style={
                order.status === "PREPARING"
                  ? { animationDuration: "4s" }
                  : undefined
              }
            >
              {cfg.icon}
            </span>
          </div>
          <div className="space-y-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-headline text-[18px] font-bold text-[#2c1810]">
                #{order.id}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold ${cfg.badgeClass}`}
              >
                {isActiveOrder && (
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                )}
                {cfg.label}
              </span>
              <span className="text-[#504440] text-[13px]">
                • {formatDate(order.createdAt)}
              </span>
            </div>

            {/* Items summary */}
            <p className="text-[15px] text-[#1d1b19]">
              {order.items?.slice(0, 2).map((item, i) => (
                <span key={item.id}>
                  {i > 0 && ", "}
                  <strong className="font-semibold">{item.quantity}×</strong>{" "}
                  {item.productName}
                </span>
              ))}
              {order.items?.length > 2 && (
                <span className="text-[#504440]">
                  {" "}
                  +{order.items.length - 2} khác
                </span>
              )}
            </p>

            {/* Payment + pickup info */}
            <div className="flex items-center gap-2 text-[11px] text-[#504440]">
              <span className="material-symbols-outlined text-sm text-[#845326]">
                credit_card
              </span>
              <span>
                {payLabel}
                {isActiveOrder && " • Kệ Express Bar 04 • Dự kiến ~3-5 phút"}
                {order.status === "COMPLETED" && (
                  <span className="ml-1 text-[#845326] font-semibold">
                    • +{Math.floor(order.totalAmount / 5000)} hạt tích lũy
                  </span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Total + CTA */}
        <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-[#f3ede9]">
          <div className="text-left md:text-right">
            <span className="block font-headline text-[18px] font-bold text-[#2c1810]">
              {vnd(order.totalAmount)}
            </span>
            <span className="text-[11px] text-[#504440]">
              {order.items?.length ?? 0} sản phẩm
            </span>
          </div>
          <Link
            href={`/order-confirmation?orderId=${order.id}`}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-all active:scale-95 shadow-sm
              ${
                isReadyStatus
                  ? "bg-emerald-700 hover:bg-emerald-800 text-white"
                  : isActiveOrder
                  ? "bg-[#2c1810] hover:bg-[#351300] text-white"
                  : "bg-[#f3ede9] hover:bg-[#ede7e3] text-[#2c1810]"
              }
            `}
          >
            <span className="material-symbols-outlined text-base">
              {isReadyStatus
                ? "qr_code"
                : isActiveOrder
                ? "visibility"
                : "receipt_long"}
            </span>
            <span>
              {isReadyStatus
                ? "Mã lấy nước"
                : isActiveOrder
                ? "Theo dõi"
                : "Chi tiết"}
            </span>
          </Link>
        </div>
      </div>
    </article>
  );
}

// ── Main page content ─────────────────────────────────────────────────────────

function OrdersContent() {
  const router = useRouter();
  const { isAuthenticated, _hasHydrated, user } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    apiFetch("/orders/me")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Order[]) => {
        setOrders(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [isAuthenticated]);

  // Stats
  const activeOrders = orders.filter((o) => isActive(o.status));
  const totalPoints = orders.reduce(
    (sum, o) =>
      ["PAID", "COMPLETED", "PREPARING", "READY"].includes(o.status)
        ? sum + Math.floor(o.totalAmount / 5000)
        : sum,
    0
  );

  // Filter logic
  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active") return isActive(o.status) || o.status === "PENDING";
    if (filter === "completed") return o.status === "COMPLETED";
    if (filter === "cancelled")
      return o.status === "CANCELLED" || o.status === "PAYMENT_FAILED";
    return true;
  });

  const filterTabs: { key: FilterKey; label: string; icon: string; count: number }[] = [
    { key: "all", label: "Tất cả", icon: "receipt_long", count: orders.length },
    {
      key: "active",
      label: "Đang thực hiện",
      icon: "local_cafe",
      count: orders.filter(
        (o) => isActive(o.status) || o.status === "PENDING"
      ).length,
    },
    {
      key: "completed",
      label: "Đã hoàn thành",
      icon: "check_circle",
      count: orders.filter((o) => o.status === "COMPLETED").length,
    },
    {
      key: "cancelled",
      label: "Đã hủy",
      icon: "cancel",
      count: orders.filter(
        (o) => o.status === "CANCELLED" || o.status === "PAYMENT_FAILED"
      ).length,
    },
  ];

  return (
    <div className="min-h-screen bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body">
      <Header cartCount={0} activeTab="orders" />

      <main className="flex-1 w-full bg-[#fef8f4]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 w-full py-6">

          {/* ── Breadcrumb bar ── */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6">
            <div className="flex items-center gap-3">
              <Link
                href="/menu"
                className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f3ede9] hover:bg-[#ede7e3] text-[#1d1b19] text-[13px] font-semibold transition-all group shadow-sm"
              >
                <span className="material-symbols-outlined text-base text-[#845326] group-hover:-translate-x-0.5 transition-transform">
                  arrow_back
                </span>
                <span>Quay lại Thực đơn</span>
              </Link>
              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#504440]">
                <span>BrewLite Downtown</span>
                <span className="material-symbols-outlined text-xs">chevron_right</span>
                <span className="text-[#845326] font-semibold">Tài khoản &amp; Lịch sử</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#febc85]/30 text-[#78491d] text-[11px] font-bold">
                <span className="material-symbols-outlined text-sm text-[#845326]">offline_bolt</span>
                Thanh toán 100% Cashless
              </span>
            </div>
          </div>

          {/* ── Page title + stats ── */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-8">
            <div>
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#845326] animate-ping" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#845326]">
                  Cập nhật đơn hàng trực tiếp
                </span>
              </div>
              <h1 className="font-headline text-4xl md:text-5xl font-bold text-[#1d1b19] tracking-tight">
                Đơn hàng của tôi
              </h1>
              <p className="text-[#504440] text-[15px] mt-1 max-w-2xl">
                Theo dõi tiến độ pha chế thời gian thực và lịch sử giao dịch không tiền mặt
                {user?.fullName && (
                  <span className="font-semibold text-[#2c1810]"> của {user.fullName}</span>
                )}
                .
              </p>
            </div>

            {/* Mini stats */}
            {!loading && orders.length > 0 && (
              <div className="flex items-center gap-2 p-1.5 bg-[#f8f2ee] rounded-2xl">
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-center min-w-[80px]">
                  <span className="block text-[22px] font-bold text-[#845326] font-headline">
                    {String(activeOrders.length).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] text-[#504440]">Đang xử lý</span>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-center min-w-[80px]">
                  <span className="block text-[22px] font-bold text-[#1d1b19] font-headline">
                    {String(orders.length).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] text-[#504440]">Tổng đơn</span>
                </div>
                <div className="px-4 py-2 bg-white rounded-xl shadow-sm text-center min-w-[90px]">
                  <span className="block text-[22px] font-bold text-[#1d1b19] font-headline">
                    +{totalPoints}
                  </span>
                  <span className="text-[11px] text-[#845326] font-semibold">Hạt Tích Lũy</span>
                </div>
              </div>
            )}
          </div>

          {/* Loading state */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-[#2c1810]/20 border-t-[#2c1810] animate-spin" />
              <p className="text-[#504440] text-sm">Đang tải đơn hàng...</p>
            </div>
          ) : (
            <>
              {/* ── Filter tabs ── */}
              <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
                {filterTabs.map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold transition-all shrink-0
                      ${
                        filter === tab.key
                          ? "bg-[#2c1810] text-white shadow-sm"
                          : "bg-[#f3ede9] hover:bg-[#ede7e3] text-[#504440]"
                      }
                    `}
                  >
                    <span className="material-symbols-outlined text-base">{tab.icon}</span>
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold
                        ${filter === tab.key ? "bg-white/20" : "bg-[#2c1810]/10 text-[#2c1810]"}
                      `}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── Active hero section ── */}
              {(filter === "all" || filter === "active") && activeOrders.length > 0 && (
                <section className="mb-8">
                  <div className="relative overflow-hidden bg-white rounded-3xl p-5 sm:p-8 shadow-md">
                    {/* Ambient glows */}
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#ffdcc2]/30 blur-3xl pointer-events-none" />
                    <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-[#febc85]/20 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#f3ede9]">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-4 py-1 rounded-full bg-[#2c1810] text-[#fef8f4] text-[11px] font-bold tracking-wide">
                          <span className="w-2 h-2 rounded-full bg-[#febc85] animate-ping" />
                          ĐANG PHA CHẾ • LIVE
                        </span>
                        <span className="font-headline text-[22px] font-bold text-[#1d1b19]">
                          #{activeOrders[0].id}
                        </span>
                        <span className="text-[#504440] text-[13px]">
                          • Đặt lúc {formatDate(activeOrders[0].createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-[#f8f2ee] text-[#1d1b19] shadow-sm">
                        <span className="material-symbols-outlined text-[#845326] text-2xl">
                          countertops
                        </span>
                        <div>
                          <span className="block text-[11px] text-[#504440] uppercase font-bold">
                            Địa điểm nhận nước
                          </span>
                          <span className="font-headline text-[15px] font-semibold text-[#2c1810]">
                            Trạm 02 • Kệ Express 04
                          </span>
                        </div>
                        <div className="ml-2 pl-3 border-l border-[#e7e1dd]">
                          <span className="text-[13px] font-bold text-[#845326]">
                            Dự kiến ~3 phút
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress stepper */}
                    <div className="relative z-10 py-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          {
                            icon: "check",
                            label: "1. Đã thanh toán",
                            desc: "Xác thực thành công qua Cashless",
                            done: true,
                            active: false,
                          },
                          {
                            icon: "autorenew",
                            label: "2. Đang pha chế",
                            desc: "Barista đang chiết xuất espresso & foam sữa",
                            done: false,
                            active: true,
                          },
                          {
                            icon: "takeout_dining",
                            label: "3. Sẵn sàng lấy",
                            desc: "Nhận tại Kệ Express 04 với mã QR",
                            done: false,
                            active: false,
                          },
                        ].map((step, i) => (
                          <div
                            key={i}
                            className={`flex items-start gap-3 p-4 rounded-2xl transition-all
                              ${step.active ? "bg-[#ffdcc2]/40 ring-1 ring-[#845326]/30" : step.done ? "bg-[#f8f2ee]" : "bg-[#f8f2ee] opacity-70"}
                            `}
                          >
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm
                                ${step.done ? "bg-[#845326] text-white" : step.active ? "bg-[#2c1810] text-[#febc85]" : "bg-[#ede7e3] text-[#504440]"}
                              `}
                            >
                              <span
                                className={`material-symbols-outlined text-xl ${step.active ? "animate-spin" : ""}`}
                                style={step.active ? { animationDuration: "4s" } : undefined}
                              >
                                {step.icon}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-[15px] font-bold text-[#2c1810] block">{step.label}</span>
                              <p className="text-[13px] text-[#504440] mt-0.5">{step.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom action */}
                    <div className="relative z-10 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-[11px] text-[#504440]">Tổng tiền đã thanh toán</span>
                        <span className="block font-headline text-[28px] font-bold text-[#845326] tracking-tight">
                          {vnd(activeOrders[0].totalAmount)}
                        </span>
                      </div>
                      <Link
                        href={`/order-confirmation?orderId=${activeOrders[0].id}`}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2c1810] hover:bg-[#351300] text-white font-semibold text-[13px] shadow-md transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-xl text-[#febc85]">qr_code_scanner</span>
                        <span>Mã nhận nước (QR)</span>
                      </Link>
                    </div>
                  </div>
                </section>
              )}

              {/* ── Order list ── */}
              <section>
                <div className="flex items-center justify-between pb-2 mb-4">
                  <div>
                    <h2 className="font-headline text-[22px] font-bold text-[#1d1b19]">
                      Lịch sử giao dịch
                    </h2>
                    <p className="text-[13px] text-[#504440]">
                      Trạng thái xử lý theo Order State Machine
                    </p>
                  </div>
                  <span className="text-[13px] text-[#504440]">
                    Hiển thị{" "}
                    <span className="font-bold text-[#2c1810]">{filtered.length}</span>{" "}
                    giao dịch
                  </span>
                </div>

                {filtered.length === 0 ? (
                  /* ── Empty state ── */
                  <div className="flex flex-col items-center justify-center py-20 gap-5">
                    <div className="w-20 h-20 rounded-full bg-[#f3ede9] flex items-center justify-center">
                      <span className="material-symbols-outlined text-4xl text-[#845326]">
                        coffee
                      </span>
                    </div>
                    <div className="text-center">
                      <h3 className="font-headline text-[18px] font-bold text-[#2c1810] mb-1">
                        {filter === "all"
                          ? "Chưa có đơn hàng nào"
                          : "Không có đơn hàng trong mục này"}
                      </h3>
                      <p className="text-[#504440] text-[15px] max-w-xs">
                        {filter === "all"
                          ? "Hãy khám phá thực đơn và đặt ly cà phê đầu tiên của bạn!"
                          : "Thử xem mục khác hoặc đặt thêm đơn mới."}
                      </p>
                    </div>
                    <Link
                      href="/menu"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#2c1810] hover:bg-[#351300] text-white font-semibold text-[13px] transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-base">storefront</span>
                      Khám phá thực đơn
                    </Link>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filtered.map((order) => (
                      <OrderCard key={order.id} order={order} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-[#2c1810]/20 border-t-[#2c1810] animate-spin" />
        </div>
      }
    >
      <OrdersContent />
    </Suspense>
  );
}

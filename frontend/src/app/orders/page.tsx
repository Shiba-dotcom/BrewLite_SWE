"use client";

import React, { Suspense, useEffect, useState, useRef, useCallback } from "react";
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
    badgeClass: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
    iconBg: "bg-amber-100 text-amber-800",
    icon: "schedule",
    iconClass: "",
  },
  PAID: {
    label: "Đã thanh toán • Chờ Barista nhận",
    badgeClass: "bg-[#2c1810] text-[#ffdcc2] ring-1 ring-[#2c1810]",
    iconBg: "bg-[#2c1810] text-[#ffdcc2]",
    icon: "receipt_long",
    iconClass: "",
    animated: false,
  },
  PREPARING: {
    label: "Barista đang pha chế",
    badgeClass: "bg-[#845326] text-white ring-1 ring-[#845326]",
    iconBg: "bg-[#2c1810] text-[#febc85]",
    icon: "autorenew",
    iconClass: "animate-spin",
    animated: true,
  },
  READY: {
    label: "🔔 Món đã xong • Mời lấy nước!",
    badgeClass: "bg-emerald-600 text-white ring-2 ring-emerald-300 shadow-sm",
    iconBg: "bg-emerald-600 text-white",
    icon: "notifications_active",
    iconClass: "animate-bounce",
    animated: true,
  },
  COMPLETED: {
    label: "Đã nhận nước • Hoàn thành",
    badgeClass: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
    iconBg: "bg-emerald-100 text-emerald-700",
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
  const isPreparingStatus = order.status === "PREPARING";
  const isActiveOrder = isActive(order.status);

  return (
    <article
      className={`bg-white rounded-2xl p-4 sm:p-6 shadow-sm hover:shadow-md transition-all ${
        isReadyStatus
          ? "ring-2 ring-emerald-500 bg-gradient-to-r from-white via-emerald-50/30 to-emerald-50/60"
          : isPreparingStatus
          ? "ring-1 ring-[#845326]/40"
          : ""
      }`}
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
                #BL-{order.id}
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
              {order.items?.slice(0, 3).map((item, i) => (
                <span key={item.id}>
                  {i > 0 && ", "}
                  <strong className="font-semibold">{item.quantity}×</strong>{" "}
                  {item.productName} ({item.size || "M"})
                </span>
              ))}
              {order.items?.length > 3 && (
                <span className="text-[#504440]">
                  {" "}
                  +{order.items.length - 3} món khác
                </span>
              )}
            </p>

            {/* Payment + pickup info */}
            <div className="flex flex-wrap items-center gap-2 text-[12px] text-[#504440]">
              <span className="material-symbols-outlined text-sm text-[#845326]">
                credit_card
              </span>
              <span>{payLabel}</span>
              {order.status === "PAID" && (
                <span className="text-[#845326] font-semibold">
                  • Đã gửi xuống quầy Barista • Dự kiến ~3-5 phút
                </span>
              )}
              {order.status === "PREPARING" && (
                <span className="text-[#845326] font-bold">
                  • Barista đang pha chế trực tiếp tại Trạm #01
                </span>
              )}
              {order.status === "READY" && (
                <span className="text-emerald-700 font-extrabold">
                  • 🔔 Mời bạn đến Kệ Express Bar 04 nhận đồ uống ngay!
                </span>
              )}
              {order.status === "COMPLETED" && (
                <span className="text-emerald-700 font-semibold">
                  • Đã bàn giao lúc{" "}
                  {new Date(order.updatedAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  • +{Math.floor(order.totalAmount / 1000)} hạt tích lũy
                </span>
              )}
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
              {order.items?.reduce((s, i) => s + i.quantity, 0) ?? 0} ly/phần
            </span>
          </div>
          <Link
            href={`/order-confirmation?orderId=${order.id}`}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-semibold text-[13px] transition-all active:scale-95 shadow-sm ${
              isReadyStatus
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                : isActiveOrder
                ? "bg-[#2c1810] hover:bg-[#351300] text-white"
                : "bg-[#f3ede9] hover:bg-[#ede7e3] text-[#2c1810]"
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {isReadyStatus
                ? "qr_code_2"
                : isActiveOrder
                ? "visibility"
                : "receipt_long"}
            </span>
            <span>
              {isReadyStatus
                ? "Lấy nước ngay (QR)"
                : isActiveOrder
                ? "Theo dõi trực tiếp"
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
  const [selectedHeroOrderId, setSelectedHeroOrderId] = useState<number | null>(
    null
  );
  const [liveToast, setLiveToast] = useState<{
    orderId: number;
    status: string;
    message: string;
  } | null>(null);
  const prevStatusMapRef = useRef<Record<number, string>>({});

  // Play gentle notification chime when drink status updates to READY
  const playCustomerChime = useCallback(() => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;
      [587.33, 880, 1174.66].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.14 + 0.35);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.38);
      });
    } catch {
      // ignore audio block
    }
  }, []);

  // Redirect nếu chưa đăng nhập
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push("/login");
    }
  }, [_hasHydrated, isAuthenticated, router]);

  // Fetch & Auto-poll every 3 seconds so Barista status transitions appear immediately
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;

    const fetchMyOrders = (isInitial = false) => {
      apiFetch("/orders/me")
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Order[]) => {
          if (!isMounted) return;
          const list = Array.isArray(data) ? data : [];

          if (Object.keys(prevStatusMapRef.current).length > 0) {
            for (const ord of list) {
              const prev = prevStatusMapRef.current[ord.id];
              if (prev && prev !== ord.status) {
                if (ord.status === "PREPARING") {
                  setSelectedHeroOrderId(ord.id);
                  setLiveToast({
                    orderId: ord.id,
                    status: "PREPARING",
                    message: `☕ Barista đã tiếp nhận Đơn #BL-${ord.id} và đang bắt đầu pha chế!`,
                  });
                } else if (ord.status === "READY") {
                  playCustomerChime();
                  setSelectedHeroOrderId(ord.id);
                  setLiveToast({
                    orderId: ord.id,
                    status: "READY",
                    message: `🔔 ĐỒ UỐNG ĐÃ PHA XONG! Mời bạn lấy Đơn #BL-${ord.id} tại Kệ Express Bar 04!`,
                  });
                } else if (ord.status === "COMPLETED") {
                  playCustomerChime();
                  setLiveToast({
                    orderId: ord.id,
                    status: "COMPLETED",
                    message: `✅ Đơn #BL-${ord.id} đã bàn giao thành công. Chúc bạn thưởng thức ngon miệng!`,
                  });
                } else if (ord.status === "CANCELLED") {
                  setLiveToast({
                    orderId: ord.id,
                    status: "CANCELLED",
                    message: `⚠️ Đơn #BL-${ord.id} đã được hủy tại quầy.`,
                  });
                }
              }
            }
          }

          const nextMap: Record<number, string> = {};
          list.forEach((o) => {
            nextMap[o.id] = o.status;
          });
          prevStatusMapRef.current = nextMap;

          setOrders(list);
          if (isInitial) setLoading(false);
        })
        .catch(() => {
          if (isInitial && isMounted) setLoading(false);
        });
    };

    fetchMyOrders(true);
    const interval = setInterval(() => fetchMyOrders(false), 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, playCustomerChime]);

  // Sort active orders so READY comes first, then PREPARING, then PAID
  const activeOrders = [...orders.filter((o) => isActive(o.status))].sort(
    (a, b) => {
      const rank = (s: string) =>
        s === "READY" ? 0 : s === "PREPARING" ? 1 : 2;
      return rank(a.status) - rank(b.status);
    }
  );
  const readyOrders = activeOrders.filter((o) => o.status === "READY");
  const heroOrder =
    activeOrders.find((o) => o.id === selectedHeroOrderId) || activeOrders[0];

  const totalPoints = orders.reduce(
    (sum, o) =>
      ["PAID", "COMPLETED", "PREPARING", "READY"].includes(o.status)
        ? sum + Math.floor(o.totalAmount / 1000)
        : sum,
    0
  );

  // Filter logic
  const filtered = orders.filter((o) => {
    if (filter === "all") return true;
    if (filter === "active")
      return isActive(o.status) || o.status === "PENDING";
    if (filter === "completed") return o.status === "COMPLETED";
    if (filter === "cancelled")
      return o.status === "CANCELLED" || o.status === "PAYMENT_FAILED";
    return true;
  });

  const filterTabs: {
    key: FilterKey;
    label: string;
    icon: string;
    count: number;
  }[] = [
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

  // Dynamic step calculation for heroOrder
  const heroStatus = heroOrder?.status ?? "PAID";
  const heroSteps = [
    {
      icon: "check",
      label: "1. Đã thanh toán & gửi quầy",
      desc:
        heroStatus === "PAID"
          ? "Đơn đã vào màn hình Barista KDS, đang chờ tiếp nhận"
          : "Xác thực thành công qua Cashless",
      done: heroStatus === "PREPARING" || heroStatus === "READY",
      active: heroStatus === "PAID",
    },
    {
      icon: heroStatus === "READY" ? "check" : "autorenew",
      label: "2. Barista đang pha chế",
      desc:
        heroStatus === "PREPARING"
          ? "Barista đang đong nguyên liệu & chiết xuất trực tiếp"
          : heroStatus === "READY"
          ? "Đã hoàn tất pha chế & kiểm tra chất lượng"
          : "Sẽ bắt đầu ngay khi Barista bấm nhận đơn",
      done: heroStatus === "READY",
      active: heroStatus === "PREPARING",
    },
    {
      icon: "notifications_active",
      label: "3. Sẵn sàng lấy món!",
      desc:
        heroStatus === "READY"
          ? "🔔 Mời bạn đến Kệ Express Bar 04 xuất trình mã nhận nước!"
          : "Chuông sẽ báo ngay khi Barista pha xong",
      done: false,
      active: heroStatus === "READY",
    },
  ];

  return (
    <div className="min-h-screen bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body">
      <Header cartCount={0} activeTab="orders" />

      {/* ── FLOATING LIVE NOTIFICATION TOAST FROM BARISTA ── */}
      {liveToast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-md px-5 py-4 rounded-2xl shadow-2xl border flex items-start gap-3 animate-bounce ${
            liveToast.status === "READY"
              ? "bg-emerald-700 text-white border-emerald-400"
              : liveToast.status === "COMPLETED"
              ? "bg-[#2c1810] text-[#fef8f4] border-[#febc85]"
              : "bg-[#2c1810] text-white border-[#845326]"
          }`}
        >
          <span className="material-symbols-outlined text-2xl shrink-0">
            {liveToast.status === "READY"
              ? "notifications_active"
              : liveToast.status === "COMPLETED"
              ? "task_alt"
              : "coffee_maker"}
          </span>
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {liveToast.message}
          </div>
          <button
            type="button"
            onClick={() => setLiveToast(null)}
            className="text-white/80 hover:text-white font-bold text-xs"
          >
            ✕
          </button>
        </div>
      )}

      <main className="flex-1 w-full bg-[#fef8f4]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12 w-full py-6">
          {/* ── PROMINENT PICKUP CALL BANNER WHEN ANY ORDER IS READY ── */}
          {readyOrders.length > 0 && (
            <div className="mb-6 rounded-3xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white p-5 sm:p-6 shadow-xl border-2 border-emerald-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white text-emerald-700 flex items-center justify-center shrink-0 shadow-md">
                  <span className="material-symbols-outlined text-3xl animate-bounce">
                    notifications_active
                  </span>
                </div>
                <div>
                  <span className="inline-block px-3 py-0.5 rounded-full bg-white/20 text-[11px] font-extrabold uppercase tracking-wider mb-1">
                    🔔 QUẦY BARISTA ĐANG GỌI TÊN BẠN
                  </span>
                  <h2 className="font-headline text-xl sm:text-2xl font-bold">
                    Đơn hàng{" "}
                    {readyOrders.map((o) => `#BL-${o.id}`).join(", ")} đã pha
                    chế xong!
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-50 mt-0.5">
                    Mời bạn di chuyển đến{" "}
                    <strong>Kệ Express Bar số 04</strong> để nhận đồ uống ngay
                    khi còn tươi ngon nhất.
                  </p>
                </div>
              </div>
              <Link
                href={`/order-confirmation?orderId=${readyOrders[0].id}`}
                className="px-5 py-3 rounded-2xl bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-xs sm:text-sm flex items-center gap-2 shrink-0 shadow-md transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-lg">
                  qr_code_2
                </span>
                <span>Mở mã nhận nước #BL-{readyOrders[0].id}</span>
              </Link>
            </div>
          )}

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
                <span className="material-symbols-outlined text-xs">
                  chevron_right
                </span>
                <span className="text-[#845326] font-semibold">
                  Tài khoản &amp; Lịch sử
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Đồng bộ trực tiếp với Barista KDS (3s)
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
                Theo dõi tiến độ pha chế thời gian thực và lịch sử giao dịch
                không tiền mặt
                {user?.fullName && (
                  <span className="font-semibold text-[#2c1810]">
                    {" "}
                    của {user.fullName}
                  </span>
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
                  <span className="text-[11px] text-[#845326] font-semibold">
                    Hạt Tích Lũy
                  </span>
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
                    className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-[13px] font-semibold transition-all shrink-0 cursor-pointer ${
                      filter === tab.key
                        ? "bg-[#2c1810] text-white shadow-sm"
                        : "bg-[#f3ede9] hover:bg-[#ede7e3] text-[#504440]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {tab.icon}
                    </span>
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[11px] font-bold ${
                        filter === tab.key
                          ? "bg-white/20"
                          : "bg-[#2c1810]/10 text-[#2c1810]"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* ── Active hero section (DYNAMICALLY SYNCED WITH BARISTA STATUS!) ── */}
              {(filter === "all" || filter === "active") && heroOrder && (
                <section className="mb-8">
                  {/* Switcher if user has multiple active orders */}
                  {activeOrders.length > 1 && (
                    <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
                      <span className="text-xs font-bold text-[#504440] shrink-0">
                        Đơn đang theo dõi trực tiếp:
                      </span>
                      {activeOrders.map((ao) => (
                        <button
                          key={ao.id}
                          type="button"
                          onClick={() => setSelectedHeroOrderId(ao.id)}
                          className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                            heroOrder.id === ao.id
                              ? ao.status === "READY"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "bg-[#2c1810] text-[#febc85] shadow-xs"
                              : "bg-white text-[#504440] border border-[#e7e1dd]"
                          }`}
                        >
                          <span>#BL-{ao.id}</span>
                          <span className="text-[10px] opacity-90">
                            (
                            {ao.status === "READY"
                              ? "🔔 Sẵn sàng lấy"
                              : ao.status === "PREPARING"
                              ? "☕ Đang pha"
                              : "Chờ nhận"}
                            )
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={`relative overflow-hidden bg-white rounded-3xl p-5 sm:p-8 shadow-md transition-all ${
                      heroStatus === "READY"
                        ? "ring-2 ring-emerald-500 shadow-emerald-500/10"
                        : ""
                    }`}
                  >
                    {/* Ambient glows */}
                    <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-[#ffdcc2]/30 blur-3xl pointer-events-none" />
                    <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-[#febc85]/20 blur-2xl pointer-events-none" />

                    <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-[#f3ede9]">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-wide ${
                            heroStatus === "READY"
                              ? "bg-emerald-600 text-white shadow-sm"
                              : heroStatus === "PREPARING"
                              ? "bg-[#845326] text-white"
                              : "bg-[#2c1810] text-[#fef8f4]"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full animate-ping ${
                              heroStatus === "READY"
                                ? "bg-white"
                                : "bg-[#febc85]"
                            }`}
                          />
                          {heroStatus === "READY"
                            ? "🔔 ĐÃ PHA XONG • MỜI BẠN LẤY NƯỚC (READY)"
                            : heroStatus === "PREPARING"
                            ? "☕ BARISTA ĐANG PHA CHẾ • LIVE"
                            : "⏳ ĐÃ THANH TOÁN • CHỜ BARISTA NHẬN ĐƠN"}
                        </span>
                        <span className="font-headline text-[22px] font-bold text-[#1d1b19]">
                          #BL-{heroOrder.id}
                        </span>
                        <span className="text-[#504440] text-[13px]">
                          • Đặt lúc {formatDate(heroOrder.createdAt)}
                        </span>
                      </div>

                      <div
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl shadow-sm ${
                          heroStatus === "READY"
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                            : "bg-[#f8f2ee] text-[#1d1b19]"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-2xl ${
                            heroStatus === "READY"
                              ? "text-emerald-600 animate-bounce"
                              : "text-[#845326]"
                          }`}
                        >
                          {heroStatus === "READY"
                            ? "notifications_active"
                            : "countertops"}
                        </span>
                        <div>
                          <span className="block text-[11px] opacity-75 uppercase font-bold">
                            Địa điểm nhận nước
                          </span>
                          <span className="font-headline text-[15px] font-semibold">
                            Trạm 01 • Kệ Express Bar 04
                          </span>
                        </div>
                        <div className="ml-2 pl-3 border-l border-current/15">
                          <span
                            className={`text-[13px] font-extrabold ${
                              heroStatus === "READY"
                                ? "text-emerald-700"
                                : "text-[#845326]"
                            }`}
                          >
                            {heroStatus === "READY"
                              ? "Mời nhận ngay!"
                              : heroStatus === "PREPARING"
                              ? "Đang chiết xuất..."
                              : "Dự kiến ~3-5 phút"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dynamic 3-Step Progress Stepper */}
                    <div className="relative z-10 py-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {heroSteps.map((step, i) => {
                          const isReadyHighlight =
                            i === 2 && heroStatus === "READY";
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 p-4 rounded-2xl transition-all ${
                                isReadyHighlight
                                  ? "bg-emerald-50 ring-2 ring-emerald-500 shadow-sm"
                                  : step.active
                                  ? "bg-[#ffdcc2]/40 ring-1 ring-[#845326]/40"
                                  : step.done
                                  ? "bg-[#f8f2ee]"
                                  : "bg-[#f8f2ee] opacity-60"
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                                  isReadyHighlight
                                    ? "bg-emerald-600 text-white"
                                    : step.done
                                    ? "bg-[#2D6A4F] text-white"
                                    : step.active
                                    ? "bg-[#2c1810] text-[#febc85]"
                                    : "bg-[#ede7e3] text-[#504440]"
                                }`}
                              >
                                <span
                                  className={`material-symbols-outlined text-xl ${
                                    step.active && heroStatus === "PREPARING"
                                      ? "animate-spin"
                                      : isReadyHighlight
                                      ? "animate-bounce"
                                      : ""
                                  }`}
                                  style={
                                    step.active && heroStatus === "PREPARING"
                                      ? { animationDuration: "4s" }
                                      : undefined
                                  }
                                >
                                  {step.icon}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-[15px] font-bold block ${
                                    isReadyHighlight
                                      ? "text-emerald-900"
                                      : "text-[#2c1810]"
                                  }`}
                                >
                                  {step.label}
                                </span>
                                <p
                                  className={`text-[13px] mt-0.5 ${
                                    isReadyHighlight
                                      ? "text-emerald-700 font-semibold"
                                      : "text-[#504440]"
                                  }`}
                                >
                                  {step.desc}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Items in this active order + Bottom action */}
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#f3ede9]">
                      <div>
                        <span className="text-[11px] text-[#504440] block">
                          Món trong đơn #BL-{heroOrder.id}:{" "}
                          <strong className="text-[#2c1810]">
                            {heroOrder.items
                              ?.map(
                                (it) =>
                                  `${it.quantity}× ${it.productName} (${
                                    it.size || "M"
                                  })`
                              )
                              .join(", ")}
                          </strong>
                        </span>
                        <span className="block font-headline text-[26px] font-bold text-[#845326] tracking-tight mt-0.5">
                          {vnd(heroOrder.totalAmount)}
                        </span>
                      </div>
                      <Link
                        href={`/order-confirmation?orderId=${heroOrder.id}`}
                        className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-[13px] shadow-md transition-all active:scale-95 ${
                          heroStatus === "READY"
                            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                            : "bg-[#2c1810] hover:bg-[#351300] text-white"
                        }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          qr_code_scanner
                        </span>
                        <span>
                          {heroStatus === "READY"
                            ? "Xuất trình Mã nhận nước ngay (QR)"
                            : "Xem Vé nhận nước & Tiến trình"}
                        </span>
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
                      Trạng thái xử lý tự động đồng bộ từ Quầy Barista KDS
                    </p>
                  </div>
                  <span className="text-[13px] text-[#504440]">
                    Hiển thị{" "}
                    <span className="font-bold text-[#2c1810]">
                      {filtered.length}
                    </span>{" "}
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
                      <span className="material-symbols-outlined text-base">
                        storefront
                      </span>
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

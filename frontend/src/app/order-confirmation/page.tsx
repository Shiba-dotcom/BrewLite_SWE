"use client";

import React, { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiFetch, useAuthStore } from "../store/authStore";

interface ConfirmationOrderItem {
  id: number;
  productId: number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
  unitPrice: number;
}

interface ConfirmationPayment {
  id: number;
  method: string;
  status: string;
  amount: number;
  createdAt: string;
}

interface ConfirmationOrderDetail {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
  items: ConfirmationOrderItem[];
  payments: ConfirmationPayment[];
}

const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "₫";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PAID: {
    label: "PAID • CHỜ BARISTA NHẬN ĐƠN",
    color: "text-amber-800 bg-amber-50 ring-amber-200",
  },
  PENDING: {
    label: "PENDING • CHỜ THANH TOÁN",
    color: "text-amber-700 bg-amber-50 ring-amber-100",
  },
  PAYMENT_FAILED: {
    label: "PAYMENT FAILED • THANH TOÁN LỖI",
    color: "text-red-700 bg-red-50 ring-red-100",
  },
  PREPARING: {
    label: "PREPARING • BARISTA ĐANG PHA CHẾ",
    color: "text-[#845326] bg-[#ffdcc2]/50 ring-[#845326]/40",
  },
  READY: {
    label: "🔔 READY • MỜI BẠN LẤY NƯỚC NGAY!",
    color: "text-white bg-emerald-600 ring-emerald-400 shadow-sm",
  },
  COMPLETED: {
    label: "COMPLETED • ĐÃ NHẬN MÓN HOÀN TẤT",
    color: "text-emerald-800 bg-emerald-50 ring-emerald-200",
  },
  CANCELLED: {
    label: "CANCELLED • ĐÃ HỦY",
    color: "text-red-700 bg-red-50 ring-red-100",
  },
};

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<ConfirmationOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [receiptState, setReceiptState] = useState<"idle" | "loading" | "done">(
    "idle"
  );
  const prevStatusRef = useRef<string | null>(null);

  const playReadyChime = useCallback(() => {
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

  // Fetch & Auto-poll every 3 seconds so status updates live when Barista clicks READY / COMPLETED
  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    let isMounted = true;

    const fetchDetail = (isInitial = false) => {
      apiFetch(`/orders/${orderId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data: ConfirmationOrderDetail | null) => {
          if (!isMounted) return;
          if (data) {
            if (
              prevStatusRef.current &&
              prevStatusRef.current !== data.status &&
              (data.status === "READY" || data.status === "COMPLETED")
            ) {
              playReadyChime();
            }
            prevStatusRef.current = data.status;
            setOrder(data);
            if (isInitial) {
              useAuthStore.getState().refreshProfile();
            }
          }
          if (isInitial) setLoading(false);
        })
        .catch(() => {
          if (isInitial && isMounted) setLoading(false);
        });
    };

    fetchDetail(true);
    const interval = setInterval(() => fetchDetail(false), 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [orderId, playReadyChime]);

  const handleDownloadReceipt = () => {
    setReceiptState("loading");
    setTimeout(() => {
      setReceiptState("done");
      setTimeout(() => setReceiptState("idle"), 3000);
    }, 800);
  };

  const status = order?.status ?? "PAID";
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS["PAID"];
  const isReady = status === "READY";
  const isCompleted = status === "COMPLETED";
  const isPreparing = status === "PREPARING";

  // Loyalty points (Task 10: 1 hạt vàng per 1.000 VNĐ)
  const loyaltyPoints = order ? Math.floor(order.totalAmount / 1000) : 0;

  // Payment method label
  const paymentMethod =
    order?.payments?.[0]?.method === "CARD"
      ? "Thẻ ngân hàng"
      : order?.payments?.[0]?.method === "MOMO"
      ? "Ví MoMo Express"
      : "Ví điện tử";

  // Time string
  const timeStr = order?.createdAt
    ? new Date(order.createdAt).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      }) + " Hôm nay"
    : "Hôm nay";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#2c1810]/20 border-t-[#2c1810] animate-spin" />
          <p className="text-sm text-[#504440] font-body">
            Đang tải đơn hàng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body">
      <Header cartCount={0} activeTab="orders" />

      <main className="flex-1 w-full bg-[#fef8f4]">
        <div className="relative w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-10 md:py-14">
          {/* Ambient blobs */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#febc85]/20 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-96 right-12 w-80 h-80 bg-[#e7e1dd]/60 rounded-full blur-3xl pointer-events-none -z-10" />

          {/* Centered Stage */}
          <div className="max-w-2xl mx-auto flex flex-col items-center text-center">
            {/* ── Animated check / ready badge ── */}
            <div className="relative mb-6">
              <div
                className={`absolute inset-0 rounded-full blur-lg animate-pulse ${
                  isReady ? "bg-emerald-400/50" : "bg-[#febc85]/40"
                }`}
              />
              <div className="relative w-20 h-20 rounded-full bg-white shadow-[0_8px_24px_-4px_rgba(44,24,16,0.12)] flex items-center justify-center ring-4 ring-[#f3ede9]">
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    isReady
                      ? "bg-emerald-600 text-white"
                      : isCompleted
                      ? "bg-[#2D6A4F] text-white"
                      : "bg-[#2c1810] text-[#ffdcc2]"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-3xl ${
                      isReady
                        ? "animate-bounce"
                        : isPreparing
                        ? "animate-spin"
                        : ""
                    }`}
                    style={
                      isPreparing
                        ? { animationDuration: "4s" }
                        : { fontVariationSettings: "'FILL' 1" }
                    }
                  >
                    {isReady
                      ? "notifications_active"
                      : isPreparing
                      ? "autorenew"
                      : "check_circle"}
                  </span>
                </div>
              </div>
              {/* Loyalty chip */}
              <div className="absolute -top-1 -right-3 bg-[#ffdcc2] text-[#2e1500] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs">
                  local_cafe
                </span>
                <span>+{loyaltyPoints} Hạt</span>
              </div>
            </div>

            {/* ── Status tag ── */}
            <span
              className={`inline-flex items-center gap-1.5 px-4 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3 ${
                isReady
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "bg-[#f3ede9] text-[#78491d]"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full animate-ping ${
                  isReady ? "bg-white" : "bg-[#845326]"
                }`}
              />
              {isReady
                ? "🔔 Quầy Barista đang gọi bạn nhận món!"
                : isPreparing
                ? "☕ Barista đang pha chế trực tiếp (Auto-sync 3s)"
                : isCompleted
                ? "✅ Đã bàn giao đồ uống hoàn tất"
                : "Giao dịch không tiền mặt thành công (Auto-sync 3s)"}
            </span>

            {/* ── Dynamic Headline ── */}
            <h1 className="font-headline text-3xl md:text-[42px] text-[#2c1810] tracking-tight leading-tight mb-2">
              {isReady
                ? "Đồ uống đã sẵn sàng lấy!"
                : isPreparing
                ? "Barista đang pha chế món của bạn!"
                : isCompleted
                ? "Đã nhận nước thành công!"
                : "Đặt hàng thành công!"}
            </h1>
            <p className="text-[#504440] text-base max-w-lg mb-8">
              {isReady ? (
                <>
                  Mời bạn di chuyển đến{" "}
                  <strong className="text-emerald-700">
                    Kệ Express Bar số 04
                  </strong>{" "}
                  và đọc mã đơn <strong>#BL-{order?.id ?? orderId}</strong> để
                  nhận nước ngay.
                </>
              ) : isPreparing ? (
                <>
                  Barista tại{" "}
                  <span className="font-semibold text-[#2c1810]">
                    BrewLite Downtown Roastery
                  </span>{" "}
                  đã tiếp nhận đơn và đang chiết xuất đồ uống tươi cho bạn.
                </>
              ) : (
                <>
                  Cảm ơn bạn đã lựa chọn trải nghiệm tự động &amp; không tiền mặt
                  tại{" "}
                  <span className="font-semibold text-[#2c1810]">
                    BrewLite Downtown Roastery
                  </span>
                  .
                </>
              )}
            </p>

            {/* ── Boarding-pass ticket card ── */}
            <div
              className={`w-full bg-white rounded-3xl shadow-[0_12px_36px_-6px_rgba(44,24,16,0.08)] text-left relative overflow-hidden transition-all ${
                isReady ? "ring-2 ring-emerald-500" : ""
              }`}
            >
              {/* Top gradient ribbon */}
              <div
                className={`absolute top-0 left-0 right-0 h-2 ${
                  isReady
                    ? "bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400"
                    : "bg-gradient-to-r from-[#2c1810] via-[#845326] to-[#febc85]"
                }`}
              />

              {/* Header info row */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-5 bg-[#f8f2ee]/50 -mx-0 px-6 sm:px-8 pt-8 rounded-t-3xl">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-[#504440] uppercase tracking-wider">
                    Mã số đơn hàng (Xuất trình tại quầy)
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="font-headline text-4xl md:text-5xl text-[#2c1810] tracking-tighter font-bold">
                      #BL-{order?.id ?? orderId ?? "1042"}
                    </span>
                    <span className="text-[11px] font-bold text-[#504440] font-mono">
                      / EX-BAR 04
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-bold ring-1 ${statusInfo.color}`}
                  >
                    <span
                      className="material-symbols-outlined text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {isReady ? "notifications_active" : "verified"}
                    </span>
                    <span>{statusInfo.label}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#504440] text-xs">
                    <span className="inline-flex items-center gap-1 font-semibold text-[11px] bg-[#f3ede9] px-2 py-0.5 rounded">
                      <span className="material-symbols-outlined text-xs">
                        qr_code_scanner
                      </span>
                      {paymentMethod}
                    </span>
                    <span>{timeStr}</span>
                  </div>
                </div>
              </div>

              <div className="px-6 sm:px-8 pb-8">
                {/* Express counter banner (DYNAMIC BY STATUS!) */}
                <div
                  className={`mt-5 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isReady
                      ? "bg-emerald-50 border-2 border-emerald-400"
                      : isCompleted
                      ? "bg-emerald-50/60 border border-emerald-200"
                      : "bg-[#f8f2ee]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-11 h-11 rounded-xl text-white flex items-center justify-center shrink-0 shadow-sm ${
                        isReady || isCompleted
                          ? "bg-emerald-600"
                          : "bg-[#2c1810]"
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined text-2xl ${
                          isReady ? "animate-bounce" : ""
                        }`}
                      >
                        {isReady
                          ? "notifications_active"
                          : isCompleted
                          ? "task_alt"
                          : "coffee_maker"}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[15px] font-bold text-[#2c1810] leading-snug">
                        {isReady
                          ? "🔔 Mời bạn nhận đồ uống tại Kệ Express Bar số 04!"
                          : isCompleted
                          ? "✅ Đã bàn giao đồ uống tại Kệ Express Bar số 04"
                          : isPreparing
                          ? "☕ Barista đang pha chế đơn của bạn tại Trạm 01"
                          : "⏳ Đơn đã gửi xuống Kệ Express Bar số 04"}
                      </span>
                      <p className="text-[13px] text-[#504440] mt-0.5">
                        {isReady
                          ? "Ly nước của bạn đã hoàn thiện và đặt sẵn trên kệ trả món Express Pickup."
                          : isCompleted
                          ? "Cảm ơn bạn đã thưởng thức tại BrewLite. Điểm thưởng đã được cộng vào ví!"
                          : isPreparing
                          ? "Barista đang đong định lượng nguyên liệu tươi và chiết xuất espresso."
                          : "Đang chờ Barista bấm nhận đơn trên màn hình KDS (~1-2 phút)."}
                      </p>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full shrink-0 self-start md:self-auto ${
                      isReady
                        ? "bg-emerald-600 text-white"
                        : "bg-[#f3ede9] text-[#2c1810]"
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                        isReady ? "bg-white" : "bg-[#845326]"
                      }`}
                    />
                    <span className="text-[11px] font-bold">
                      {isReady
                        ? "SẴN SÀNG NHẬN MÓN"
                        : isCompleted
                        ? "ĐÃ BÀN GIAO"
                        : isPreparing
                        ? "ĐANG PHA CHẾ"
                        : "CHỜ TIẾP NHẬN"}
                    </span>
                  </div>
                </div>

                {/* Progress tracker (3 ACCURATE STEPS: PAID -> PREPARING -> READY/COMPLETED) */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold text-[#2c1810] uppercase tracking-wider">
                      Tiến trình pha chế trực tiếp (Đồng bộ thời gian thực)
                    </span>
                    <span className="text-[11px] text-[#504440]">
                      Trạm Barista KDS #01
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    {/* Step 1: Đã thanh toán / Tiếp nhận */}
                    <div className="flex flex-col gap-1.5">
                      <div className="h-2.5 rounded-full bg-[#2c1810]" />
                      <div className="flex items-center gap-1 text-[11px] font-bold text-[#2c1810]">
                        <span className="material-symbols-outlined text-sm text-emerald-600">
                          check_circle
                        </span>
                        <span>1. Đã thanh toán</span>
                      </div>
                    </div>

                    {/* Step 2: Đang pha chế */}
                    <div className="flex flex-col gap-1.5">
                      <div className="relative h-2.5 rounded-full bg-[#ede7e3] overflow-hidden">
                        {(isPreparing || isReady || isCompleted) && (
                          <div
                            className={`absolute inset-0 rounded-full ${
                              isReady || isCompleted
                                ? "bg-[#2c1810] w-full"
                                : "bg-[#845326] w-3/4 animate-pulse"
                            }`}
                          />
                        )}
                      </div>
                      <div
                        className={`flex items-center gap-1 text-[11px] font-bold ${
                          isPreparing
                            ? "text-[#845326]"
                            : isReady || isCompleted
                            ? "text-[#2c1810]"
                            : "text-[#504440] opacity-55"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            isPreparing ? "animate-spin" : ""
                          }`}
                        >
                          {isReady || isCompleted ? "check_circle" : "autorenew"}
                        </span>
                        <span>
                          {isPreparing
                            ? "2. Đang pha chế..."
                            : isReady || isCompleted
                            ? "2. Đã pha xong"
                            : "2. Chờ pha chế"}
                        </span>
                      </div>
                    </div>

                    {/* Step 3: Sẵn sàng lấy */}
                    <div
                      className={`flex flex-col gap-1.5 ${
                        !isReady && !isCompleted ? "opacity-55" : ""
                      }`}
                    >
                      <div
                        className={`h-2.5 rounded-full ${
                          isReady
                            ? "bg-emerald-600 animate-pulse"
                            : isCompleted
                            ? "bg-emerald-700"
                            : "bg-[#ede7e3]"
                        }`}
                      />
                      <div
                        className={`flex items-center gap-1 text-[11px] font-bold ${
                          isReady
                            ? "text-emerald-700"
                            : isCompleted
                            ? "text-emerald-800"
                            : "text-[#504440]"
                        }`}
                      >
                        <span
                          className={`material-symbols-outlined text-sm ${
                            isReady ? "animate-bounce" : ""
                          }`}
                        >
                          {isCompleted ? "task_alt" : "notifications_active"}
                        </span>
                        <span>
                          {isCompleted
                            ? "3. Đã nhận món"
                            : isReady
                            ? "3. Mời lấy nước ngay!"
                            : "3. Sẵn sàng lấy"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dashed ticket cut-line */}
                <div className="relative my-6 -mx-6 sm:-mx-8 py-2">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#fef8f4] rounded-r-full shadow-inner" />
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-8 bg-[#fef8f4] rounded-l-full shadow-inner" />
                  <div className="w-full h-px border-t border-dashed border-[#e7e1dd]" />
                </div>

                {/* Items list */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#504440] uppercase tracking-wider">
                    <span>
                      Chi tiết món đã đặt ({order?.items?.length ?? 0} loại)
                    </span>
                    <span>Thành tiền</span>
                  </div>

                  {order?.items?.length ? (
                    order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-[#ede7e3] overflow-hidden shrink-0 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-[#845326]">
                              local_cafe
                            </span>
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[15px] font-semibold text-[#2c1810] truncate">
                              {item.productName}
                            </span>
                            <span className="text-[13px] text-[#504440] truncate">
                              Size {item.size}
                              {item.toppings?.length > 0 &&
                                ` • ${item.toppings.join(", ")}`}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[15px] font-bold text-[#2c1810]">
                            {vnd(item.unitPrice * item.quantity)}
                          </span>
                          <span className="text-[11px] text-[#504440]">
                            x{item.quantity} ly
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-[#504440] text-center py-2">
                      Không có thông tin sản phẩm.
                    </p>
                  )}
                </div>

                {/* Receipt totals */}
                <div className="mt-5 bg-[#f8f2ee] rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between text-[13px] text-[#504440]">
                    <span>Tạm tính đồ uống</span>
                    <span className="font-medium text-[#1d1b19]">
                      {vnd(order?.totalAmount ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-[#e7e1dd]">
                    <span className="text-[18px] font-semibold text-[#2c1810]">
                      Tổng thanh toán
                    </span>
                    <div className="flex items-baseline gap-1 text-right">
                      <span className="font-headline text-[28px] leading-8 font-bold text-[#2c1810]">
                        {vnd(order?.totalAmount ?? 0)}
                      </span>
                    </div>
                  </div>
                  {/* Loyalty points earned */}
                  <div className="pt-2 flex items-center justify-between text-[#78491d] text-[11px] font-semibold bg-[#ffdcc2]/50 px-4 py-1.5 rounded-lg">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-[#845326]">
                        stars
                      </span>
                      <span>Điểm thưởng tích lũy đơn này:</span>
                    </div>
                    <span className="font-bold">
                      +{loyaltyPoints} Hạt Vàng BrewLite Club
                    </span>
                  </div>
                </div>

                {/* Eco badge + receipt download */}
                <div className="w-full mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 px-1 text-[#504440] text-[13px]">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-base text-[#845326]">
                      eco
                    </span>
                    <span>
                      Phục vụ trong 100% Cốc Bã Mía Sinh Học phân hủy tự nhiên.
                    </span>
                  </div>
                  <button
                    onClick={handleDownloadReceipt}
                    className="flex items-center gap-1 text-[#2c1810] hover:text-[#845326] text-[13px] font-semibold transition-colors cursor-pointer"
                  >
                    {receiptState === "idle" && (
                      <>
                        <span className="material-symbols-outlined text-base">
                          receipt_long
                        </span>
                        <span>Tải hóa đơn điện tử (E-Receipt)</span>
                      </>
                    )}
                    {receiptState === "loading" && (
                      <>
                        <span className="material-symbols-outlined text-base animate-spin">
                          sync
                        </span>
                        <span>Đang tải e-receipt...</span>
                      </>
                    )}
                    {receiptState === "done" && (
                      <>
                        <span className="material-symbols-outlined text-base text-[#845326]">
                          check_circle
                        </span>
                        <span>Đã lưu hóa đơn PDF!</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="w-full mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/menu"
                className="w-full sm:w-auto min-w-[220px] h-12 px-10 rounded-full bg-[#2c1810] hover:bg-[#351300] text-white text-[15px] font-semibold flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(44,24,16,0.16)] active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">
                  storefront
                </span>
                <span>Về trang Thực đơn</span>
              </Link>
              <Link
                href="/orders"
                className="w-full sm:w-auto min-w-[220px] h-12 px-10 rounded-full bg-[#ede7e3] hover:bg-[#e7e1dd] text-[#2c1810] text-[15px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">
                  history
                </span>
                <span>Danh sách Đơn hàng</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-[#2c1810]/20 border-t-[#2c1810] animate-spin" />
            <p className="text-sm text-[#504440]">Đang tải...</p>
          </div>
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}

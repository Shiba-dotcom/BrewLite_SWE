"use client";

import React, { Suspense, useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Wallet,
  Building2,
  Sparkles,
  ArrowRight,
  RefreshCw,
  PlusCircle,
  RotateCcw,
  X,
  CreditCard,
} from "lucide-react";
import { apiFetch, useAuthStore } from "../../store/authStore";
import { useCartStore } from "../../store/cartStore";

function vnd(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

const DEFAULT_BALANCE = 1000000; // 1.000.000đ mặc định
const BALANCE_STORAGE_KEY = "zalopay_sandbox_wallet_balance";

function ZaloPayGatewayContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const { user } = useAuthStore();

  // Lấy các tham số từ URL
  const orderId = Number(searchParams.get("orderId")) || 0;
  const initialAmount = Number(searchParams.get("amount")) || 0;
  const appTransId =
    searchParams.get("appTransId") ||
    `261024_${orderId}_${Math.floor(100000 + Math.random() * 900000)}`;
  const token = searchParams.get("token") || "";

  // State quản lý luồng thanh toán
  const [amount] = useState(initialAmount);
  const [walletBalance, setWalletBalance] = useState<number>(DEFAULT_BALANCE);
  const [timeLeft, setTimeLeft] = useState(900); // 15 phút đếm ngược
  const [status, setStatus] = useState<"READY" | "PROCESSING" | "SUCCESS" | "FAILED">("READY");
  const [errorMessage, setErrorMessage] = useState("");
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [, startTransition] = useTransition();

  // State Nạp tiền vào ví
  const [isTopupModalOpen, setIsTopupModalOpen] = useState(false);
  const [topupAmountInput, setTopupAmountInput] = useState("500000");
  const [topupSuccessMsg, setTopupSuccessMsg] = useState("");

  // Tên và SĐT chủ ví động
  const accountHolder = user?.fullName || "MÃ GIA VỸ (ZaloPay Sandbox User)";
  const accountPhone = user?.phone || "0901***001";

  // Đọc số dư từ localStorage khi mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(BALANCE_STORAGE_KEY);
      if (saved !== null && !isNaN(Number(saved)) && Number(saved) >= 0) {
        setWalletBalance(Number(saved));
      } else {
        localStorage.setItem(BALANCE_STORAGE_KEY, String(DEFAULT_BALANCE));
        setWalletBalance(DEFAULT_BALANCE);
      }
    } catch {
      // fallback
    }
  }, []);

  // Đếm ngược 15 phút
  useEffect(() => {
    if (status === "SUCCESS") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [status]);

  // Format mm:ss
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Đếm ngược tự động chuyển hướng khi thành công
  useEffect(() => {
    if (status !== "SUCCESS") return;

    // Xóa giỏ hàng khi đơn đã thanh toán thành công
    clearCart();

    const interval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          startTransition(() => {
            router.push(`/order-confirmation?orderId=${orderId}`);
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status, orderId, router, clearCart]);

  // Hành động Nạp tiền vào Ví
  const handleTopup = (addAmount: number) => {
    if (addAmount <= 0) return;
    const nextBal = walletBalance + addAmount;
    setWalletBalance(nextBal);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(BALANCE_STORAGE_KEY, String(nextBal));
      } catch {}
    }
    setIsTopupModalOpen(false);
    setErrorMessage(""); // Xóa thông báo lỗi thiếu tiền nếu có
    setTopupSuccessMsg(`Đã nạp thành công +${vnd(addAmount)} vào ví ZaloPay!`);
    setTimeout(() => setTopupSuccessMsg(""), 3500);
  };

  // Đặt lại số dư về mặc định 1.000.000đ
  const handleResetBalance = () => {
    setWalletBalance(DEFAULT_BALANCE);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(BALANCE_STORAGE_KEY, String(DEFAULT_BALANCE));
      } catch {}
    }
    setErrorMessage("");
    setTopupSuccessMsg("Đã khôi phục số dư ví về 1.000.000đ");
    setTimeout(() => setTopupSuccessMsg(""), 3000);
  };

  // Hành động 1: Xác nhận thanh toán qua ZaloPay
  const handleConfirmPayment = async () => {
    if (status === "PROCESSING" || status === "SUCCESS") return;

    // KIỂM TRA ĐIỀU KIỆN SỐ DƯ VÍ
    if (amount > walletBalance) {
      setStatus("FAILED");
      const missing = amount - walletBalance;
      setErrorMessage(
        `Giao dịch không thành công do số dư ví ZaloPay (${vnd(walletBalance)}) không đủ để thanh toán đơn hàng này (${vnd(amount)}). Bạn còn thiếu ${vnd(missing)}, vui lòng nạp thêm tiền vào ví để tiếp tục.`
      );
      return;
    }

    setStatus("PROCESSING");
    setErrorMessage("");

    try {
      // Giả lập trễ mạng bảo mật 1 giây tạo cảm giác giao dịch thực tế
      await new Promise((r) => setTimeout(r, 1000));

      const res = await apiFetch("/payments/zalopay/confirm", {
        method: "POST",
        body: JSON.stringify({
          orderId,
          appTransId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        // Trừ tiền ví ZaloPay trên UI và lưu localStorage
        const paidAmount = data.totalAmount || amount;
        const newBal = Math.max(0, walletBalance - paidAmount);
        setWalletBalance(newBal);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(BALANCE_STORAGE_KEY, String(newBal));
          } catch {}
        }
        setStatus("SUCCESS");
      } else {
        setStatus("FAILED");
        setErrorMessage(data.message || "Xác thực giao dịch từ máy chủ ZaloPay thất bại");
      }
    } catch (err: unknown) {
      setStatus("FAILED");
      setErrorMessage(
        err instanceof Error ? err.message : "Không thể kết nối đến máy chủ Cổng thanh toán ZaloPay"
      );
    }
  };

  // Hành động 2: Hủy giao dịch và quay về Checkout
  const handleCancel = async () => {
    try {
      await apiFetch("/payments/zalopay/cancel", {
        method: "POST",
        body: JSON.stringify({ orderId }),
      });
    } catch {
      // bỏ qua lỗi nếu có
    }
    router.push(`/checkout?canceled=true&orderId=${orderId}`);
  };

  const isInsufficient = amount > walletBalance;

  return (
    <div className="min-h-screen bg-[#F5F7FB] text-stone-800 flex flex-col font-sans selection:bg-[#0068FF] selection:text-white">
      {/* ─── HEADER CHUẨN ZALOPAY GATEWAY ─── */}
      <header className="bg-gradient-to-r from-[#0068FF] via-[#005AE0] to-[#0047BA] text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo ZaloPay SVG */}
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs p-1">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                <rect width="100" height="100" rx="20" fill="#0068FF" />
                <path
                  d="M25 32H75L35 72H75"
                  stroke="white"
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight">ZaloPay</span>
                <span className="text-xs uppercase tracking-wider font-semibold opacity-90 border-l border-white/30 pl-2">
                  Gateway
                </span>
              </div>
              <p className="text-[11px] text-blue-100 font-medium">
                Cổng thanh toán điện tử bảo mật VNG Corporation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1.5 bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 px-2.5 py-1 rounded-full font-semibold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Môi trường Sandbox VNG
            </span>
            <div className="hidden md:flex items-center gap-1.5 text-blue-100 text-[11px] border-l border-white/20 pl-3">
              <Lock size={12} className="text-emerald-300" />
              <span>PCI-DSS Level 1</span>
            </div>
          </div>
        </div>
      </header>

      {/* ─── NỘI DUNG CHÍNH ─── */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-center">
        {status === "SUCCESS" ? (
          /* ── MÀN HÌNH THÀNH CÔNG RỰC RỠ ── */
          <div className="max-w-xl w-full mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-emerald-100 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-5 ring-8 ring-emerald-50">
              <CheckCircle2 size={48} className="stroke-[2.5]" />
            </div>

            <span className="inline-block bg-emerald-100 text-emerald-800 text-xs font-extrabold uppercase px-3 py-1 rounded-full mb-3 tracking-wider">
              Giao dịch thành công
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 mb-2">
              Thanh toán hoàn tất!
            </h1>
            <p className="text-stone-600 text-sm mb-6">
              Cổng ZaloPay đã xác thực chữ ký bảo mật và cập nhật đơn hàng thành công sang BrewLite Coffee.
            </p>

            {/* Chi tiết biên nhận ZaloPay */}
            <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/70 text-left space-y-2.5 mb-6 text-xs sm:text-sm">
              <div className="flex justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500">Mã đơn hàng BrewLite:</span>
                <span className="font-bold text-stone-900">#{orderId}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500">Mã giao dịch ZaloPay (app_trans_id):</span>
                <span className="font-mono font-bold text-stone-900">{appTransId}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500">Số tiền thanh toán:</span>
                <span className="font-bold text-[#0068FF] text-base">{vnd(amount)}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-stone-200">
                <span className="text-stone-500">Nguồn tiền thanh toán:</span>
                <span className="font-medium text-stone-800 flex items-center gap-1.5">
                  <Wallet size={14} className="text-[#0068FF]" />
                  Ví ZaloPay Sandbox ({accountHolder})
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-stone-500">Số dư ví ZaloPay còn lại:</span>
                <span className="font-bold text-emerald-700">{vnd(walletBalance)}</span>
              </div>
            </div>

            {/* Đếm ngược chuyển hướng */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 mb-5 flex items-center justify-center gap-2 text-xs font-semibold text-[#0052CC]">
              <RefreshCw size={14} className="animate-spin text-[#0068FF]" />
              <span>
                Tự động quay về BrewLite Coffee sau {redirectCountdown} giây...
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                clearCart();
                router.push(`/order-confirmation?orderId=${orderId}`);
              }}
              className="w-full py-3.5 px-6 bg-[#0068FF] hover:bg-[#0052CC] text-white font-extrabold rounded-2xl text-sm flex items-center justify-center gap-2 transition shadow-lg shadow-blue-500/25 cursor-pointer"
            >
              <span>Về BrewLite Coffee nhận đồ uống ngay</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          /* ── GIAO DIỆN CỔNG ZALOPAY THANH TOÁN TIÊU CHUẨN ── */
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200/80 overflow-hidden">
            {/* Thanh thông báo đếm ngược hạn thanh toán */}
            <div className="bg-[#FFF8E6] border-b border-[#FFE8A3] px-6 py-2.5 flex items-center justify-between text-xs text-[#8A5800]">
              <div className="flex items-center gap-2 font-medium">
                <Clock size={14} className="text-[#D97706]" />
                <span>Thời gian giữ đơn hàng còn lại:</span>
              </div>
              <span className="font-mono font-extrabold text-sm text-[#B45309] bg-white px-2.5 py-0.5 rounded-lg border border-[#FDE68A] shadow-xs">
                {formatTime(timeLeft)}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* CỘT TRÁI (5 phần): THÔNG TIN ĐƠN HÀNG & THỤ HƯỞNG */}
              <div className="lg:col-span-5 p-6 sm:p-8 bg-gradient-to-b from-stone-50 to-white border-b lg:border-b-0 lg:border-r border-stone-200 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-2 uppercase tracking-wider font-bold">
                    <Building2 size={14} className="text-[#0068FF]" />
                    Đơn vị bán hàng
                  </div>
                  <h2 className="text-lg font-black text-stone-900 leading-snug">
                    Công ty Cổ phần Cà phê BrewLite
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Hệ thống đặt cà phê công nghệ & bánh ngọt cao cấp
                  </p>

                  <div className="mt-6 p-4 rounded-2xl bg-white border border-stone-200 shadow-xs space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-stone-500">Mã đơn hàng:</span>
                      <span className="font-bold text-stone-800">#{orderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-500">Mã giao dịch ZaloPay:</span>
                      <span className="font-mono font-medium text-stone-700 truncate max-w-[150px]">
                        {appTransId}
                      </span>
                    </div>
                    <div className="flex justify-between items-baseline pt-2 border-t border-stone-100">
                      <span className="text-stone-600 font-semibold">Tổng tiền thanh toán:</span>
                      <span className="text-xl font-extrabold text-[#0068FF]">
                        {vnd(amount)}
                      </span>
                    </div>
                  </div>

                  {/* Mã QR ZaloPay động chuẩn */}
                  <div className="mt-6 flex flex-col items-center p-4 bg-white rounded-2xl border border-stone-200 text-center">
                    <p className="text-xs font-bold text-stone-700 mb-2.5">
                      Quét mã bằng ZaloPay trên điện thoại:
                    </p>
                    <div className="relative w-44 h-44 bg-white p-2 border border-stone-200 rounded-xl shadow-xs flex items-center justify-center overflow-hidden">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                          token ? `zalopay://pay?token=${token}` : `https://qcgateway.zalopay.vn/openinapp?app_trans_id=${appTransId}`
                        )}`}
                        alt="ZaloPay QR Sandbox"
                        fill
                        unoptimized
                        sizes="176px"
                        className="object-contain"
                      />
                    </div>
                    <span className="text-[11px] text-stone-500 mt-2">
                      Hoặc thực hiện thanh toán trực tiếp ở khung bên phải
                    </span>
                  </div>
                </div>

                <div className="pt-6 text-[11px] text-stone-500 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600 shrink-0" />
                  <span>Bảo mật giao dịch bằng mã hóa HMAC-SHA256 theo chuẩn VNG</span>
                </div>
              </div>

              {/* CỘT PHẢI (7 phần): NGUỒN TIỀN VÍ & NẠP TIỀN */}
              <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-base text-stone-900 flex items-center gap-2">
                      <Wallet size={18} className="text-[#0068FF]" />
                      Nguồn tiền thanh toán
                    </h3>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetBalance}
                        className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-1 font-semibold transition px-2 py-1 rounded-lg hover:bg-stone-100 cursor-pointer"
                        title="Khôi phục số dư ví về 1.000.000đ ban đầu"
                      >
                        <RotateCcw size={12} />
                        <span>Đặt lại 1tr</span>
                      </button>
                    </div>
                  </div>

                  {/* Thông báo Nạp tiền thành công */}
                  {topupSuccessMsg && (
                    <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
                      <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                      <span className="font-semibold">{topupSuccessMsg}</span>
                    </div>
                  )}

                  {/* Thông báo lỗi khi không đủ tiền hoặc lỗi thanh toán */}
                  {errorMessage && (
                    <div className="mb-4 p-4 bg-rose-50 border-2 border-rose-300 text-rose-800 rounded-2xl text-xs space-y-2 animate-in fade-in">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                        <span className="font-medium leading-relaxed">{errorMessage}</span>
                      </div>
                      {isInsufficient && (
                        <div className="pt-2 border-t border-rose-200 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsTopupModalOpen(true)}
                            className="px-3.5 py-1.5 bg-[#0068FF] hover:bg-[#0050C8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                          >
                            <PlusCircle size={14} />
                            <span>Nạp thêm tiền vào ví ngay</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thẻ Ví ZaloPay Sandbox */}
                  <div
                    className={`rounded-2xl p-4 mb-4 transition shadow-xs relative border-2 ${
                      isInsufficient
                        ? "border-rose-400 bg-rose-50/40"
                        : "border-[#0068FF] bg-[#F2F7FF]"
                    }`}
                  >
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsTopupModalOpen(true)}
                        className="px-3 py-1.5 rounded-xl bg-[#0068FF] hover:bg-[#0050C8] text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <PlusCircle size={14} />
                        <span>+ Nạp tiền</span>
                      </button>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-white border border-[#BFDBFE] p-1.5 flex items-center justify-center shrink-0 shadow-2xs">
                        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
                          <rect width="100" height="100" rx="20" fill="#0068FF" />
                          <path
                            d="M25 32H75L35 72H75"
                            stroke="white"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>

                      <div className="space-y-1 pr-24">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm">
                            Ví điện tử ZaloPay
                          </span>
                          <span className="bg-blue-100 text-[#0068FF] text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Sandbox
                          </span>
                        </div>
                        <p className="text-xs text-stone-600 font-medium">
                          Chủ ví: <strong className="text-stone-800">{accountHolder}</strong>
                        </p>
                        <p className="text-xs text-stone-600 font-mono">
                          Số điện thoại: <strong>{accountPhone}</strong>
                        </p>

                        <div className="pt-2 flex items-center gap-2 text-xs flex-wrap">
                          <span className="font-semibold text-stone-600">Số dư khả dụng:</span>
                          <span
                            className={`font-black text-sm px-2.5 py-0.5 rounded-lg border ${
                              isInsufficient
                                ? "bg-rose-100 text-rose-700 border-rose-300"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300"
                            }`}
                          >
                            {vnd(walletBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dòng trạng thái so sánh số dư & đơn hàng */}
                    <div className="mt-3 pt-3 border-t border-stone-200/80 flex items-center justify-between text-xs">
                      <span className="text-stone-500">Cần thanh toán:</span>
                      <span className="font-extrabold text-[#0068FF]">{vnd(amount)}</span>
                    </div>
                  </div>

                  {/* Hướng dẫn ngắn */}
                  <div className="p-3.5 bg-blue-50/80 rounded-2xl border border-blue-100 text-xs text-[#1E429F] flex items-start gap-2.5">
                    <Sparkles size={16} className="text-[#0068FF] shrink-0 mt-0.5" />
                    <span>
                      {isInsufficient ? (
                        <>
                          Số dư ví hiện tại không đủ để trả cho đơn hàng này. Vui lòng bấm{" "}
                          <strong>+ Nạp tiền</strong> ở trên để nạp thêm và tiếp tục.
                        </>
                      ) : (
                        <>
                          Số dư ví hoàn toàn khả dụng. Nhấn nút <strong>Xác nhận thanh toán</strong> bên dưới để hoàn tất giao dịch.
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* ── CÁC NÚT HÀNH ĐỘNG ── */}
                <div className="pt-6 space-y-3">
                  {/* NÚT CHÍNH: THANH TOÁN BẰNG VÍ ZALOPAY */}
                  <button
                    type="button"
                    disabled={status === "PROCESSING" || isInsufficient}
                    onClick={handleConfirmPayment}
                    className={`w-full py-4 px-6 font-extrabold rounded-2xl text-base flex items-center justify-center gap-2.5 transition shadow-lg cursor-pointer transform active:scale-[0.99] ${
                      isInsufficient
                        ? "bg-stone-300 text-stone-500 cursor-not-allowed shadow-none"
                        : "bg-gradient-to-r from-[#0068FF] to-[#0050C8] hover:from-[#0050C8] hover:to-[#003B94] text-white shadow-blue-500/30"
                    }`}
                  >
                    {status === "PROCESSING" ? (
                      <>
                        <RefreshCw size={18} className="animate-spin text-white" />
                        <span>Đang xử lý giao dịch qua cổng bảo mật ZaloPay...</span>
                      </>
                    ) : isInsufficient ? (
                      <>
                        <AlertCircle size={18} className="text-rose-600" />
                        <span>Số dư không đủ — Vui lòng nạp thêm tiền</span>
                      </>
                    ) : (
                      <>
                        <Lock size={16} />
                        <span>Xác nhận thanh toán {vnd(amount)}</span>
                        <ArrowRight size={18} />
                      </>
                    )}
                  </button>

                  {/* NÚT PHỤ: HỦY GIAO DỊCH VÀ QUAY VỀ CHECKOUT */}
                  <button
                    type="button"
                    disabled={status === "PROCESSING"}
                    onClick={handleCancel}
                    className="w-full py-3 px-4 bg-white hover:bg-stone-100 text-stone-600 hover:text-stone-900 font-semibold rounded-2xl text-xs sm:text-sm border border-stone-200 transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>Hủy giao dịch & Quay về BrewLite Coffee</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODAL NẠP TIỀN VÀO VÍ ZALOPAY SANDBOX ── */}
      {isTopupModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="fixed inset-0"
            onClick={() => setIsTopupModalOpen(false)}
            aria-hidden="true"
          />

          <div
            className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6 z-10 border border-stone-200 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0068FF] flex items-center justify-center">
                  <Wallet size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-stone-900">
                    Nạp Tiền Vào Ví ZaloPay
                  </h3>
                  <p className="text-xs text-stone-500">Môi trường thử nghiệm Sandbox</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTopupModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-stone-50 p-3.5 rounded-2xl border border-stone-200 flex justify-between items-center text-xs">
                <span className="text-stone-500">Số dư hiện tại:</span>
                <span className="font-extrabold text-stone-900 text-sm">
                  {vnd(walletBalance)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">
                  Nhập số tiền muốn nạp (VNĐ):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="50000"
                    min="10000"
                    value={topupAmountInput}
                    onChange={(e) => setTopupAmountInput(e.target.value)}
                    placeholder="VD: 500000"
                    className="w-full px-4 py-3 rounded-2xl bg-[#FAF6F0] border-2 border-stone-300 focus:border-[#0068FF] text-base font-extrabold text-[#0068FF] outline-hidden transition"
                  />
                  <span className="absolute right-4 top-3.5 text-xs font-bold text-stone-400">
                    VNĐ
                  </span>
                </div>
              </div>

              {/* Nút nạp nhanh */}
              <div>
                <p className="text-[11px] font-bold text-stone-500 mb-1.5">Chọn nhanh mức nạp:</p>
                <div className="grid grid-cols-3 gap-2">
                  {[100000, 500000, 1000000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setTopupAmountInput(String(quick))}
                      className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition cursor-pointer text-center ${
                        topupAmountInput === String(quick)
                          ? "bg-blue-50 border-[#0068FF] text-[#0068FF]"
                          : "bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      +{vnd(quick)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsTopupModalOpen(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-stone-200 text-stone-600 hover:bg-stone-100 text-xs font-bold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => handleTopup(Number(topupAmountInput) || 0)}
                className="flex-1 py-3 px-4 rounded-xl bg-[#0068FF] hover:bg-[#0050C8] text-white text-xs font-extrabold transition shadow-md shadow-blue-500/20 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle size={15} />
                <span>Xác nhận Nạp tiền</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER BẢO MẬT */}
      <footer className="py-4 text-center text-xs text-stone-500 border-t border-stone-200/60 bg-white/50">
        <p>© 2026 ZaloPay & VNG Corporation. All rights reserved. Môi trường kiểm thử môn Công nghệ Phần mềm.</p>
      </footer>
    </div>
  );
}

export default function ZaloPayGatewayPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F7FB] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-stone-600">
              Đang kết nối tới Cổng thanh toán ZaloPay Gateway...
            </p>
          </div>
        </div>
      }
    >
      <ZaloPayGatewayContent />
    </Suspense>
  );
}

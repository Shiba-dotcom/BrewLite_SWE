"use client";

import React, { useState } from "react";
import { Tag, Check, X, Sparkles, AlertCircle, ArrowRight, CheckCircle2, Ticket } from "lucide-react";
import { VoucherItem } from "../cart/page";
import { useAuthStore } from "../store/authStore";

export interface VoucherModalProps {
  isOpen: boolean;
  onClose: () => void;
  vouchers: VoucherItem[];
  appliedCode: string | null;
  subtotal: number;
  onSelectVoucher: (code: string) => void;
  onRemoveVoucher: () => void;
  onRedeemSuccess?: (code: string, newQty?: number) => void;
}

interface RedeemableReward {
  id: string;
  code: string;
  title: string;
  discountPercent: number;
  maxDiscountAmount: number;
  pointCost: number;
  minOrderAmount: number;
}

const REDEEMABLE_REWARDS: RedeemableReward[] = [
  {
    id: "r_brew10",
    code: "BREW10",
    title: "Voucher Giảm 10% Toàn Đơn",
    discountPercent: 10,
    maxDiscountAmount: 15000,
    pointCost: 50,
    minOrderAmount: 0,
  },
  {
    id: "r_brew20",
    code: "BREW20",
    title: "Voucher Giảm 20% Đơn Từ 60k",
    discountPercent: 20,
    maxDiscountAmount: 25000,
    pointCost: 100,
    minOrderAmount: 60000,
  },
  {
    id: "r_brew50",
    code: "BREW50",
    title: "Siêu Voucher Giảm 50% VIP",
    discountPercent: 50,
    maxDiscountAmount: 60000,
    pointCost: 250,
    minOrderAmount: 120000,
  },
];

export function getMinOrderAmount(v: VoucherItem): number {
  const code = (v.code || "").toUpperCase();
  if (code === "BREW20") return 60000;
  if (code === "BREW50") return 120000;
  if (code === "BREW10" || code === "BREWLITE10") return 0;
  return v.minOrderAmount || 0;
}

export function calculateMaxDiscount(
  code: string,
  discountPercent: number,
  explicitMax?: number
): number {
  if (explicitMax && explicitMax > 0) return explicitMax;
  const upper = (code || "").toUpperCase();
  if (upper === "BREW10" || upper === "BREWLITE10") return 15000;
  if (upper === "BREW20" || upper === "WELCOME20") return 25000;
  if (upper === "BREW50") return 60000;
  if (upper === "BREWCOZY") return 20000; // 15% Giờ vàng

  // Tuyến tính theo các mốc chuẩn BREW10 (10% -> 15k), BREW20 (20% -> 25k), BREW50 (50% -> 60k)
  let max = 15000;
  if (discountPercent <= 10) {
    max = 15000;
  } else if (discountPercent <= 20) {
    max = 15000 + (discountPercent - 10) * 1000;
  } else {
    max = 25000 + (discountPercent - 20) * (35000 / 30);
  }
  return Math.round(max / 1000) * 1000;
}

export function getVoucherTitle(v: VoucherItem): string {
  const code = (v.code || "").toUpperCase();
  if (code === "BREW10") return "Voucher Giảm 10% Toàn Đơn";
  if (code === "BREW20") return "Voucher Giảm 20% Đơn Từ 60k";
  if (code === "BREW50") return "Siêu Voucher Giảm 50% VIP";
  if (code === "BREWCOZY") return "Ưu đãi Giờ vàng giảm 15% toàn menu";
  if (code === "BREWLITE10") return "Voucher Giảm 10% Chào Mừng";
  if (code === "WELCOME20") return "Voucher Giảm 20% Khách Hàng Mới";

  if (v.description) {
    let text = v.description;
    if (text.includes("50")) {
      text = text.replace(/đơn từ 50\.?000đ?/gi, "đơn từ 60.000đ").replace(/đơn từ 50k/gi, "đơn từ 60k");
    }
    return text;
  }
  return `Ưu đãi giảm ${v.discountPercent}%`;
}

export default function VoucherModal({
  isOpen,
  onClose,
  vouchers,
  appliedCode,
  subtotal,
  onSelectVoucher,
  onRemoveVoucher,
  onRedeemSuccess,
}: VoucherModalProps) {
  const [activeTab, setActiveTab] = useState<"available" | "redeem">("available");
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { user, isAuthenticated, redeemPoints } = useAuthStore();
  const points = user?.loyaltyPoints ?? 0;

  if (!isOpen) return null;

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleApplyVoucher = (v: VoucherItem) => {
    const min = getMinOrderAmount(v);
    if (subtotal < min) {
      const missing = min - subtotal;
      showToast(
        "error",
        `Đơn hàng còn thiếu ${missing.toLocaleString("vi-VN")}đ để dùng mã "${v.code}".`
      );
      return;
    }
    onSelectVoucher(v.code);
    showToast("success", `Đã áp dụng mã "${v.code}" (-${v.discountPercent}%) thành công!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleRedeemReward = async (reward: RedeemableReward) => {
    if (!isAuthenticated) {
      showToast("error", "Vui lòng đăng nhập để đổi Hạt Vàng lấy Voucher.");
      return;
    }

    if (points < reward.pointCost) {
      showToast(
        "error",
        `Bạn cần thêm ${reward.pointCost - points} Hạt Vàng để đổi ưu đãi này.`
      );
      return;
    }

    setRedeemingId(reward.id);
    try {
      const res = await redeemPoints(
        reward.pointCost,
        `Đổi voucher ${reward.code} (-${reward.discountPercent}%)`,
        {
          code: reward.code,
          discountPercent: reward.discountPercent,
          minOrderAmount: reward.minOrderAmount,
        }
      );

      if (res.success) {
        const qty = res.voucher?.quantity;
        showToast(
          "success",
          res.message || `Đã trừ ${reward.pointCost} Hạt Vàng & nhận mã ${reward.code}!`
        );
        onSelectVoucher(reward.code);
        if (onRedeemSuccess) onRedeemSuccess(reward.code, qty);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        showToast("error", res.message || "Đổi ưu đãi thất bại");
      }
    } catch {
      showToast("error", "Đã xảy ra lỗi khi kết nối máy chủ");
    } finally {
      setRedeemingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 animate-fadeIn">
      {/* Backdrop click to close */}
      <div className="fixed inset-0" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-lg bg-[#FAF6F0] rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh] border border-[#2c1810]/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Modal Header ── */}
        <div className="px-5 py-4 bg-white border-b border-stone-200/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0E6] text-[#845326] flex items-center justify-center shadow-2xs">
              <Ticket size={20} className="text-[#845326]" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="font-headline text-base font-bold text-[#1D1B19]">
                Kho Mã Giảm Giá & Ưu Đãi
              </h3>
              <p className="text-[11px] text-stone-500 font-body">
                Chọn mã sẵn có hoặc đổi Hạt Vàng để nhận thêm chiết khấu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-800 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Toast Alert Banner ── */}
        {toastMsg && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
              toastMsg.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-b border-emerald-200"
                : "bg-amber-50 text-amber-800 border-b border-amber-200"
            }`}
          >
            {toastMsg.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </div>
        )}

        {/* ── Navigation Tabs ── */}
        <div className="flex border-b border-stone-200/80 bg-[#f4ece4] p-1 gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "available"
                ? "bg-white text-[#2c1810] shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Tag size={13} />
            <span>Mã có sẵn ({vouchers.reduce((s, x) => s + (x.quantity || 1), 0)})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("redeem")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "redeem"
                ? "bg-white text-[#2c1810] shadow-2xs"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Sparkles size={13} className="text-[#d97706]" />
            <span>Đổi bằng Hạt Vàng</span>
            {isAuthenticated && (
              <span className="text-[10px] bg-amber-100 text-amber-900 font-extrabold px-1.5 py-0.2 rounded-full">
                {points}đ
              </span>
            )}
          </button>
        </div>

        {/* ── Scrollable Tab Content ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === "available" ? (
            <>
              {vouchers.length === 0 ? (
                <div className="py-12 text-center text-stone-400">
                  <Tag size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Hiện tại chưa có mã giảm giá nào khả dụng.</p>
                </div>
              ) : (
                vouchers.map((v) => {
                  const min = getMinOrderAmount(v);
                  const maxDiscount = calculateMaxDiscount(v.code, v.discountPercent, v.maxDiscountAmount);
                  const title = getVoucherTitle(v);
                  const isEligible = subtotal >= min;
                  const isApplied = appliedCode === v.code;
                  const missingAmount = Math.max(0, min - subtotal);
                  const progress = min > 0 ? Math.min(100, Math.round((subtotal / min) * 100)) : 100;
                  const qty = v.quantity || 1;

                  return (
                    <div
                      key={v.code}
                      className={`relative rounded-2xl border transition-all overflow-hidden flex flex-col sm:flex-row items-stretch ${
                        isApplied
                          ? "bg-[#fffaf5] border-[#845326] shadow-sm ring-1 ring-[#845326]/30"
                          : isEligible
                          ? "bg-white border-stone-200 hover:border-[#845326]/50 shadow-2xs"
                          : "bg-stone-50 border-stone-200/70 opacity-80"
                      }`}
                    >
                      {/* Left Badge: Discount % */}
                      <div
                        className={`sm:w-28 p-3.5 flex sm:flex-col items-center justify-between sm:justify-center text-center shrink-0 border-b sm:border-b-0 sm:border-r border-dashed ${
                          isApplied
                            ? "bg-gradient-to-br from-[#845326] to-[#5a3414] text-white border-white/20"
                            : isEligible
                            ? "bg-gradient-to-br from-[#2c1810] to-[#45271d] text-white border-stone-200"
                            : "bg-stone-200 text-stone-600 border-stone-300"
                        }`}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                          GIẢM
                        </span>
                        <span className="font-headline text-2xl sm:text-3xl font-extrabold leading-none my-1">
                          {v.discountPercent}%
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/20 sm:mt-1">
                          {v.code}
                        </span>
                      </div>

                      {/* Middle Details */}
                      <div className="flex-1 p-3.5 flex flex-col justify-between gap-2 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-xs text-[#1D1B19] truncate">
                              {title}
                            </h4>
                            {isApplied && (
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                                <Check size={10} strokeWidth={3} /> Đang chọn
                              </span>
                            )}
                          </div>

                          <div className="mt-1 space-y-0.5 text-[11px] text-stone-500 font-body">
                            <p>
                              {min > 0
                                ? `Áp dụng cho đơn từ ${min.toLocaleString("vi-VN")}đ`
                                : "Áp dụng cho mọi giá trị đơn hàng"}
                            </p>
                            <p>
                              Giảm tối đa:{" "}
                              <strong className="text-stone-700 font-semibold">
                                {maxDiscount.toLocaleString("vi-VN")}đ
                              </strong>
                            </p>
                          </div>

                          {/* Hiển thị rõ số lượng khả dụng trên từng thẻ voucher */}
                          <div className="mt-2 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#845326] bg-[#FAF0E6] px-2.5 py-0.5 rounded-md border border-[#845326]/20 shadow-2xs">
                              <Tag size={12} className="text-[#845326]" />
                              <span>{`Số lượng khả dụng: ${qty}`.normalize("NFC")}</span>
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar if not eligible */}
                        {!isEligible && min > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-semibold text-amber-700">
                              <span>Còn thiếu {missingAmount.toLocaleString("vi-VN")}đ</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-amber-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Action Button */}
                      <div className="p-3.5 sm:pl-0 flex items-center justify-end shrink-0">
                        {isApplied ? (
                          <button
                            type="button"
                            onClick={onRemoveVoucher}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <X size={13} strokeWidth={2.5} />
                            <span>Gỡ mã</span>
                          </button>
                        ) : isEligible ? (
                          <button
                            type="button"
                            onClick={() => handleApplyVoucher(v)}
                            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[#2c1810] hover:bg-[#432317] text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>Áp dụng</span>
                            <ArrowRight size={12} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled
                            className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-stone-100 text-stone-400 text-xs font-semibold cursor-not-allowed text-center"
                          >
                            Chưa đủ điều kiện
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </>
          ) : (
            <>
              {/* Rewards Points Header Card */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-[#22130C] via-[#351D12] to-[#1A0D07] text-white flex items-center justify-between border border-[#D4AF37]/30 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] text-stone-300 uppercase tracking-wider font-bold">
                      Hạt Vàng Khả Dụng
                    </p>
                    <p className="font-headline text-xl font-extrabold text-[#FEBC85]">
                      {points.toLocaleString("vi-VN")}{" "}
                      <span className="text-xs text-stone-300 font-sans font-normal">
                        Hạt Vàng
                      </span>
                    </p>
                  </div>
                </div>

                {!isAuthenticated && (
                  <span className="text-xs text-amber-300 font-bold bg-amber-400/20 px-2.5 py-1 rounded-full">
                    Chưa đăng nhập
                  </span>
                )}
              </div>

              {/* Redeemable Cards */}
              <div className="space-y-2.5 pt-1">
                {REDEEMABLE_REWARDS.map((reward) => {
                  const canAfford = points >= reward.pointCost;
                  const isRedeeming = redeemingId === reward.id;
                  const owned = vouchers.find((v) => v.code === reward.code);
                  const ownedQty = owned?.quantity || (owned ? 1 : 0);

                  return (
                    <div
                      key={reward.id}
                      className="relative rounded-2xl border border-stone-200 bg-white transition-all overflow-hidden flex flex-col sm:flex-row items-stretch shadow-2xs hover:border-[#845326]/50"
                    >
                      {/* Left Badge: Discount % (đồng bộ với mục Mã có sẵn theo ảnh) */}
                      <div
                        className="sm:w-28 p-3.5 flex sm:flex-col items-center justify-between sm:justify-center text-center shrink-0 border-b sm:border-b-0 sm:border-r border-dashed bg-gradient-to-br from-[#2c1810] to-[#45271d] text-white border-stone-200"
                      >
                        <span className="text-[10px] uppercase tracking-wider font-bold opacity-80">
                          GIẢM
                        </span>
                        <span className="font-headline text-2xl sm:text-3xl font-extrabold leading-none my-1">
                          {reward.discountPercent}%
                        </span>
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-white/20 sm:mt-1">
                          {reward.code}
                        </span>
                      </div>

                      {/* Middle Details */}
                      <div className="flex-1 p-3.5 flex flex-col justify-between gap-2 min-w-0">
                        <div>
                          <div>
                            <h4 className="font-bold text-xs text-[#1D1B19] truncate">
                              {reward.title}
                            </h4>
                            {ownedQty > 0 && (
                              <div className="mt-1">
                                <span className="inline-flex items-center text-[10px] font-bold text-[#92400E] bg-[#FEF3C7] px-2 py-0.5 rounded-md border border-[#FDE68A]">
                                  Đang có: x{ownedQty}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="mt-1.5 space-y-0.5 text-[11px] text-stone-500 font-body">
                            <p>
                              Chi phí:{" "}
                              <strong className="text-[#845326] font-bold">
                                {reward.pointCost} Hạt Vàng
                              </strong>
                            </p>
                            <p>
                              Giảm tối đa:{" "}
                              <strong className="text-stone-700 font-semibold">
                                {reward.maxDiscountAmount.toLocaleString("vi-VN")}đ
                              </strong>
                            </p>
                            <div className="flex items-center gap-1.5 leading-none pt-0.5">
                              <span className="leading-none text-[11px] text-stone-500">Mã:</span>
                              <span className="inline-flex items-center justify-center font-mono font-bold text-[#1D1B19] bg-stone-100 px-1.5 py-0.5 rounded text-[10px] leading-none border border-stone-200/60">
                                {reward.code}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Button */}
                      <div className="p-3.5 sm:pl-0 flex items-center justify-end shrink-0">
                        <button
                          type="button"
                          disabled={!canAfford || isRedeeming}
                          onClick={() => handleRedeemReward(reward)}
                          className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                            canAfford
                              ? "bg-[#845326] hover:bg-[#6e431d] text-white shadow-2xs active:scale-95 cursor-pointer"
                              : "bg-stone-100 text-stone-400 cursor-not-allowed"
                          }`}
                        >
                          {isRedeeming
                            ? "Đang đổi..."
                            : canAfford
                            ? `Đổi (-${reward.pointCost} Hạt)`
                            : `Thiếu ${reward.pointCost - points} Hạt`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-4 bg-white border-t border-stone-200/80 flex items-center justify-between gap-3">
          <p className="text-[11px] text-stone-500 font-body">
            {appliedCode ? (
              <span>
                Đang áp dụng: <strong className="text-[#845326] font-mono">{appliedCode}</strong>
              </span>
            ) : (
              "Chọn mã để tự động giảm giá vào giỏ hàng"
            )}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

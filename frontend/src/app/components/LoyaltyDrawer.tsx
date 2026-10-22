"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Tag } from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { useCartStore } from "../store/cartStore";
import VoucherModal, { getMinOrderAmount, calculateMaxDiscount, getVoucherTitle } from "./VoucherModal";
import type { VoucherItem } from "../cart/page";

interface LoyaltyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoyaltyDrawer({ isOpen, onClose }: LoyaltyDrawerProps) {
  const router = useRouter();
  const { user, logout, refreshProfile, isAuthenticated } = useAuthStore();
  const { setAppliedPromo, appliedPromo, cartTotal } = useCartStore();

  const [redeemedToast, setRedeemedToast] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [isRefreshingPoints, setIsRefreshingPoints] = useState(false);
  const [vouchers, setVouchers] = useState<VoucherItem[]>([
    { code: "BREWCOZY", description: "Ưu đãi Giờ vàng giảm 15% toàn menu", discountPercent: 15, minOrderAmount: 0, maxDiscountAmount: 20000, quantity: 1 },
    { code: "BREW10", description: "Voucher Giảm 10% Toàn Đơn", discountPercent: 10, minOrderAmount: 0, maxDiscountAmount: 15000, quantity: 1 },
    { code: "BREW20", description: "Voucher Giảm 20% Đơn Từ 60k", discountPercent: 20, minOrderAmount: 60000, maxDiscountAmount: 25000, quantity: 1 },
    { code: "BREW50", description: "Siêu Voucher Giảm 50% VIP", discountPercent: 50, minOrderAmount: 120000, maxDiscountAmount: 60000, quantity: 1 },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const vouchersKey = useMemo(() => {
    return (user?.vouchers || []).map((v) => `${v.code}:${v.quantity}`).join(",");
  }, [user?.vouchers]);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${apiBase}/inventory/pricing-config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        let baseList: VoucherItem[] = [
          { code: "BREWCOZY", description: "Ưu đãi Giờ vàng giảm 15% toàn menu", discountPercent: 15, minOrderAmount: 0, maxDiscountAmount: 20000, quantity: 1 },
          { code: "BREW10", description: "Voucher Giảm 10% Toàn Đơn", discountPercent: 10, minOrderAmount: 0, maxDiscountAmount: 15000, quantity: 1 },
          { code: "BREW20", description: "Voucher Giảm 20% Đơn Từ 60k", discountPercent: 20, minOrderAmount: 60000, maxDiscountAmount: 25000, quantity: 1 },
          { code: "BREW50", description: "Siêu Voucher Giảm 50% VIP", discountPercent: 50, minOrderAmount: 120000, maxDiscountAmount: 60000, quantity: 1 },
        ];
        if (data && Array.isArray(data.vouchers) && data.vouchers.length > 0) {
          baseList = data.vouchers.map((v: VoucherItem) => ({ ...v, quantity: v.quantity || 1 }));
        }

        const userVouchers = user?.vouchers || [];
        const merged = [...baseList];
        userVouchers.forEach((uv) => {
          const idx = merged.findIndex((m) => m.code === uv.code);
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              quantity: uv.quantity,
            };
          } else {
            merged.push({
              code: uv.code,
              description: `Ưu đãi ${uv.code} (-${uv.discountPercent}%)`,
              discountPercent: uv.discountPercent,
              minOrderAmount: uv.minOrderAmount,
              quantity: uv.quantity,
            });
          }
        });
        setVouchers(merged);
      })
      .catch(() => {});
  }, [vouchersKey]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      refreshProfile();
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, refreshProfile]);

  const handleRefreshPoints = async () => {
    if (isRefreshingPoints) return;
    setIsRefreshingPoints(true);
    try {
      await refreshProfile();
      setRedeemedToast("Đã cập nhật số Hạt Vàng hiện tại thành công!");
      setTimeout(() => setRedeemedToast(null), 2500);
    } catch {
      // ignore
    } finally {
      setIsRefreshingPoints(false);
    }
  };

  const handleUseVoucher = (code: string) => {
    setAppliedPromo(code);
    onClose();
    router.push("/cart");
  };

  const myVouchers = useMemo(() => {
    return vouchers.filter((v) => (v.quantity || 0) > 0).slice(0, 3);
  }, [vouchers]);

  if (!isOpen || !mounted) return null;

  const points = user?.loyaltyPoints ?? 0;
  const currentTier = points >= 300 ? "Kim Cương" : points >= 100 ? "Vàng" : "Bạc";
  const pointsToNext = points >= 300 ? 0 : points >= 100 ? 300 - points : 100 - points;
  const progressPercent = Math.min(
    100,
    points >= 300
      ? 100
      : points >= 100
        ? Math.round(((points - 100) / 200) * 100)
        : Math.round((points / 100) * 100),
  );

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "BL");

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden font-body animate-[fadeIn_0.2s_ease-out]">
      {/* ── Backdrop Overlay ── */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-over Container ── */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 z-[10000]">
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Tài khoản & Điểm tích lũy"
          className="w-screen max-w-md h-full bg-[#FAF6F0] shadow-2xl flex flex-col border-l border-[#2C1810]/10 overflow-hidden animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)]"
        >
          {/* ── 1. Top Header Bar ── */}
          <div className="flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md border-b border-[#2C1810]/10">
            <div className="flex items-center gap-2 text-[#2C1810]">
              <span className="material-symbols-outlined text-2xl text-[#845326]">
                account_circle
              </span>
              <h2 className="font-headline font-bold text-base tracking-tight text-[#1D1B19]">
                Tài khoản của tôi
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#504440] hover:text-[#1D1B19] hover:bg-[#F3EDE9] transition-colors cursor-pointer"
              aria-label="Đóng bảng tài khoản"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>

          {/* ── Scrollable Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {/* ── 2. User Profile Summary ── */}
            <div className="flex items-center gap-3.5 bg-white p-4 rounded-2xl border border-[#EDE7DE] shadow-xs">
              <div className="w-13 h-13 rounded-full bg-gradient-to-br from-[#2C1810] to-[#502816] text-white flex items-center justify-center font-bold text-base ring-3 ring-[#F3EDE9] shrink-0">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-[15px] text-[#1D1B19] truncate leading-tight">
                    {user?.fullName || "Khách hàng BrewLite"}
                  </h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] shrink-0">
                    <span className="material-symbols-outlined text-[12px]">workspace_premium</span>
                    Thành viên {currentTier}
                  </span>
                </div>
                <p className="text-[12px] text-[#827470] truncate mt-0.5">
                  {user?.email || "Chưa có email"}
                </p>
                {user?.phone && (
                  <p className="text-[11px] text-[#827470] truncate">{user.phone}</p>
                )}
              </div>
            </div>

            {/* ── 3. BrewLite Rewards Dark Card (Bám sát Stitch) ── */}
            <div className="relative rounded-2xl bg-gradient-to-br from-[#22130C] via-[#351D12] to-[#1A0D07] text-[#FEF8F4] p-5 shadow-lg overflow-hidden border border-[#D4AF37]/30">
              {/* Decorative radial glow */}
              <div className="absolute -top-12 -right-12 w-36 h-36 bg-[#D4AF37]/15 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#D4AF37]">
                    stars
                  </span>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-[#D4AF37]">
                    BREWLITE REWARDS
                  </span>
                </div>
                <span className="text-[11px] font-medium text-stone-300 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  Mã thẻ: #BL-{(user?.id ?? 1).toString().padStart(4, "0")}
                </span>
              </div>

              {/* Big Points Counter */}
              <div className="flex items-baseline gap-2 my-2">
                <span className="font-headline text-3xl font-extrabold text-[#FFF] tracking-tight">
                  {points.toLocaleString("vi-VN")}
                </span>
                <span className="text-sm font-semibold text-[#FEBC85]">
                  Điểm BrewLite (Hạt Vàng)
                </span>
              </div>

              <p className="text-[11px] text-stone-300 mb-4">
                Hạng {currentTier} • Tích lũy 1 Hạt Vàng mỗi 1.000đ thanh toán
              </p>

              {/* Progress Bar to next tier */}
              <div className="space-y-1.5 pt-2 border-t border-white/10">
                <div className="flex justify-between text-[11px] font-medium text-stone-300">
                  <span>Tiến trình nâng hạng</span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#FEBC85] transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-stone-400 text-right">
                  {pointsToNext > 0
                    ? `Tích lũy thêm ${pointsToNext} điểm để lên Hạng Kim Cương`
                    : "Bạn đã đạt Hạng Kim Cương cao nhất!"}
                </p>
              </div>

              {/* Quick Actions: Cập nhật số hạt hiện tại */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleRefreshPoints}
                  disabled={isRefreshingPoints}
                  className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white transition-colors cursor-pointer group disabled:opacity-60"
                  title="Tải lại số Hạt Vàng mới nhất từ tài khoản"
                >
                  <span
                    className={`material-symbols-outlined text-sm text-[#D4AF37] ${
                      isRefreshingPoints
                        ? "animate-spin"
                        : "group-hover:rotate-180 transition-transform duration-300"
                    }`}
                  >
                    sync
                  </span>
                  <span>
                    {isRefreshingPoints
                      ? "Đang cập nhật..."
                      : "Cập nhật số hạt hiện tại"}
                  </span>
                </button>
              </div>
            </div>

            {/* Notification Toast */}
            {redeemedToast && (
              <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2 animate-[fadeIn_0.2s_ease-out]">
                <span className="material-symbols-outlined text-base text-emerald-600">
                  check_circle
                </span>
                <span>{redeemedToast}</span>
              </div>
            )}

            {/* ── 4. Section: Ưu đãi của bạn (3 ưu đãi có thật của tài khoản) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-[#1D1B19]">
                  Ưu đãi của bạn
                </h3>
                <button
                  type="button"
                  onClick={() => setIsVoucherModalOpen(true)}
                  className="text-[11px] font-semibold text-[#845326] hover:underline cursor-pointer flex items-center gap-0.5"
                >
                  <span>Xem tất cả</span>
                  <span className="material-symbols-outlined text-[13px]">chevron_right</span>
                </button>
              </div>

              {myVouchers.length === 0 ? (
                <div className="py-8 text-center text-stone-500 bg-white rounded-2xl border border-dashed border-[#EDE7DE] p-4 text-xs font-medium">
                  Bạn hiện chưa có ưu đãi nào.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {myVouchers.map((v) => {
                    const min = getMinOrderAmount(v);
                    const maxDiscount = calculateMaxDiscount(
                      v.code,
                      v.discountPercent,
                      v.maxDiscountAmount
                    );
                    const title = getVoucherTitle(v);
                    const qty = v.quantity || 1;

                    return (
                      <div
                        key={v.code}
                        className="relative rounded-2xl border transition-all overflow-hidden flex flex-row items-stretch bg-white border-stone-200 hover:border-[#845326]/50 shadow-2xs"
                      >
                        {/* Left Badge: Discount % (Giống thiết kế Kho mã giảm giá) */}
                        <div className="w-24 p-3 flex flex-col items-center justify-center text-center shrink-0 border-r border-dashed border-stone-200 bg-gradient-to-br from-[#2c1810] to-[#45271d] text-white">
                          <span className="text-[9px] uppercase tracking-wider font-bold opacity-80">
                            GIẢM
                          </span>
                          <span className="font-headline text-2xl font-extrabold leading-none my-1">
                            {v.discountPercent}%
                          </span>
                          <span className="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-white/20">
                            {v.code}
                          </span>
                        </div>

                        {/* Middle & Right Details */}
                        <div className="flex-1 p-3 flex flex-col justify-between gap-1.5 min-w-0">
                          <div>
                            <h4
                              className="font-bold text-xs text-[#1D1B19] truncate"
                              title={title}
                            >
                              {title}
                            </h4>

                            <div className="mt-1 space-y-0.5 text-[11px] text-stone-500 font-body">
                              <p className="truncate">
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
                          </div>

                          {/* Bottom Row: Số lượng khả dụng & Nút Dùng ngay */}
                          <div className="mt-1 pt-1.5 flex items-center justify-between gap-2 border-t border-stone-100">
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#845326] bg-[#FAF0E6] px-2 py-0.5 rounded-md border border-[#845326]/20">
                              <Tag size={11} className="text-[#845326]" />
                              <span>{`Số lượng khả dụng: ${qty}`.normalize("NFC")}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleUseVoucher(v.code)}
                              className="shrink-0 px-3 py-1 rounded-xl bg-[#2C1810] hover:bg-[#3C2218] text-white text-[11px] font-bold transition-all cursor-pointer shadow-xs active:scale-95"
                            >
                              Dùng ngay
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 6. Bottom Sticky Footer (Logout Button) ── */}
          <div className="p-4 bg-white border-t border-[#2C1810]/10 flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full py-2.5 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-bold text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer border border-red-200"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Đăng xuất tài khoản</span>
            </button>
          </div>
        </aside>
      </div>

      {/* ── Voucher Modal from Loyalty Drawer ── */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        vouchers={vouchers}
        appliedCode={appliedPromo}
        subtotal={cartTotal()}
        onSelectVoucher={(code) => {
          setAppliedPromo(code);
          setIsVoucherModalOpen(false);
          onClose();
          router.push("/cart");
        }}
        onRemoveVoucher={() => setAppliedPromo(null)}
        onRedeemSuccess={(code) => {
          setAppliedPromo(code);
          setIsVoucherModalOpen(false);
          onClose();
          router.push("/cart");
        }}
      />
    </div>,
    document.body,
  );
}

"use client";

import React, { useState } from "react";
import { useAuthStore } from "../store/authStore";

interface LoyaltyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoyaltyDrawer({ isOpen, onClose }: LoyaltyDrawerProps) {
  const { user, logout, refreshProfile } = useAuthStore();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [redeemedToast, setRedeemedToast] = useState<string | null>(null);

  if (!isOpen) return null;

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

  const handleCopy = (code: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    }
  };

  const handleRedeem = (voucherTitle: string, cost: number) => {
    if (points < cost) {
      alert(`Bạn cần thêm ${cost - points} Hạt Vàng để đổi ưu đãi này!`);
      return;
    }
    setRedeemedToast(`Đã đổi thành công "${voucherTitle}"!`);
    setTimeout(() => setRedeemedToast(null), 3000);
  };

  const initials = user?.fullName
    ? user.fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.slice(0, 2).toUpperCase() ?? "BL");

  return (
    <div className="fixed inset-0 z-50 overflow-hidden font-body animate-[fadeIn_0.2s_ease-out]">
      {/* ── Backdrop Overlay ── */}
      <div
        className="fixed inset-0 bg-black/45 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* ── Slide-over Container ── */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Tài khoản & Điểm tích lũy"
          className="w-screen max-w-md bg-[#FAF6F0] shadow-2xl flex flex-col border-l border-[#2C1810]/10 overflow-hidden animate-[slideInRight_0.3s_cubic-bezier(0.16,1,0.3,1)]"
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

              {/* Quick Actions */}
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => refreshProfile()}
                  className="flex items-center gap-1.5 text-xs text-stone-300 hover:text-white transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">sync</span>
                  <span>Cập nhật số dư</span>
                </button>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#D4AF37] text-[#1A0D07] text-[11px] font-bold rounded-full">
                  <span className="material-symbols-outlined text-[13px]">qr_code_2</span>
                  Mã quét tại quầy
                </span>
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

            {/* ── 4. Section: Ưu đãi của bạn (Vouchers) ── */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm text-[#1D1B19]">
                  Ưu đãi của bạn
                </h3>
                <span className="text-[11px] font-semibold text-[#845326] hover:underline cursor-pointer">
                  Xem tất cả
                </span>
              </div>

              <div className="space-y-2.5">
                {/* Voucher 1: BREWCOZY */}
                <div className="bg-white p-3.5 rounded-xl border border-[#EDE7DE] shadow-2xs flex items-center justify-between gap-3 hover:border-[#845326]/40 transition-all">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#FAF0E6] text-[#845326] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">local_offer</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-xs text-[#1D1B19] truncate">
                          Giảm 15% toàn bộ menu
                        </h4>
                        <span className="text-[9px] bg-red-100 text-red-700 font-bold px-1.5 py-0.2 rounded font-mono">
                          HOT
                        </span>
                      </div>
                      <p className="text-[11px] text-[#827470] mt-0.5">
                        Mã: <strong className="text-[#1D1B19]">BREWCOZY</strong> • Dành cho thành viên
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy("BREWCOZY")}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-[#2C1810] hover:bg-[#3C2218] text-white text-[11px] font-bold transition-all cursor-pointer"
                  >
                    {copiedCode === "BREWCOZY" ? "Đã chép!" : "Dùng ngay"}
                  </button>
                </div>

                {/* Voucher 2: BREW10 */}
                <div className="bg-white p-3.5 rounded-xl border border-[#EDE7DE] shadow-2xs flex items-center justify-between gap-3 hover:border-[#845326]/40 transition-all">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#FEF3C7] text-[#92400E] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">redeem</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#1D1B19] truncate">
                        Giảm 10% đơn hàng
                      </h4>
                      <p className="text-[11px] text-[#827470] mt-0.5">
                        Mã: <strong className="text-[#1D1B19]">BREW10</strong> • Đổi với 20 Hạt Vàng
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleCopy("BREW10");
                      handleRedeem("Giảm 10% đơn hàng (BREW10)", 20);
                    }}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-[#FAF0E6] hover:bg-[#F3E5D8] text-[#845326] border border-[#D97736]/30 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    {copiedCode === "BREW10" ? "Đã chép!" : "Đổi ngay (20đ)"}
                  </button>
                </div>

                {/* Voucher 3: Free Topping Foam */}
                <div className="bg-white p-3.5 rounded-xl border border-[#EDE7DE] shadow-2xs flex items-center justify-between gap-3 hover:border-[#845326]/40 transition-all">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-[#E0F2FE] text-[#0369A1] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">coffee</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-[#1D1B19] truncate">
                        Miễn phí Topping Foam Muối Biển
                      </h4>
                      <p className="text-[11px] text-[#827470] mt-0.5">
                        Đổi với 15 Hạt Vàng • Áp dụng mọi ly
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRedeem("Miễn phí Topping Foam Muối Biển", 15)}
                    className="shrink-0 px-3 py-1.5 rounded-full bg-[#FAF0E6] hover:bg-[#F3E5D8] text-[#845326] border border-[#D97736]/30 text-[11px] font-bold transition-all cursor-pointer"
                  >
                    Đổi (15đ)
                  </button>
                </div>

                {/* Voucher 4: Free Size-Up All Signature */}
                <div className="bg-white/60 p-3.5 rounded-xl border border-dashed border-[#EDE7DE] flex items-center justify-between gap-3 opacity-75">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-400 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-lg">lock</span>
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-xs text-[#1D1B19] truncate">
                        Free Size-Up All Signature
                      </h4>
                      <p className="text-[11px] text-[#827470] mt-0.5">
                        Cần 50 Hạt Vàng • Hạng Kim Cương
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-stone-400 font-semibold px-2 py-1 bg-stone-100 rounded-full">
                    {points >= 50 ? "Đạt điều kiện" : "Chưa đủ điểm"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── 5. Quick Links: Quản lý tài khoản ── */}
            <div className="space-y-1.5 pt-2">
              <h3 className="font-headline font-bold text-xs text-[#827470] uppercase tracking-wider mb-2">
                Quản lý tài khoản
              </h3>

              <button
                type="button"
                onClick={() => alert(`Lịch sử tích điểm: Bạn hiện có ${points} Hạt Vàng được tích lũy từ các đơn hàng thành công.`)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#F3EDE9] border border-[#EDE7DE] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-[#1D1B19] text-xs font-semibold">
                  <span className="material-symbols-outlined text-base text-[#845326]">history_edu</span>
                  <span>Lịch sử tích & tiêu điểm</span>
                </div>
                <span className="material-symbols-outlined text-sm text-stone-400">chevron_right</span>
              </button>

              <button
                type="button"
                onClick={() => alert("Hệ thống hỗ trợ thanh toán không tiền mặt: Ví MoMo Express, Thẻ Ngân hàng NAPAS/Visa/MasterCard, Apple Pay & Google Wallet.")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#F3EDE9] border border-[#EDE7DE] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-[#1D1B19] text-xs font-semibold">
                  <span className="material-symbols-outlined text-base text-[#845326]">account_balance_wallet</span>
                  <span>Ví & Phương thức liên kết</span>
                </div>
                <span className="material-symbols-outlined text-sm text-stone-400">chevron_right</span>
              </button>

              <button
                type="button"
                onClick={() => alert("Cửa hàng quen thuộc: Downtown Roastery Bar, Q.1 - Kệ Express Bar số 04.")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-[#F3EDE9] border border-[#EDE7DE] text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5 text-[#1D1B19] text-xs font-semibold">
                  <span className="material-symbols-outlined text-base text-[#845326]">store</span>
                  <span>Địa chỉ đã lưu & Cửa hàng</span>
                </div>
                <span className="material-symbols-outlined text-sm text-stone-400">chevron_right</span>
              </button>
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
    </div>
  );
}

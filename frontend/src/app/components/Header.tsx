"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BrewLiteLogo from "./BrewLiteLogo";
import { apiFetch, useAuthStore } from "../store/authStore";
import LoyaltyDrawer from "./LoyaltyDrawer";

export interface HeaderProps {
  cartCount?: number;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeTab?: "menu" | "orders" | "staff" | "admin";
  badgeAnimated?: boolean;
}

interface HeaderOrderSummary {
  id: number;
  status: string;
  totalAmount: number;
  updatedAt: string;
  items?: { id: number; productName: string; quantity: number; size: string }[];
}

export default function Header({
  cartCount = 0,
  searchQuery = "",
  onSearchChange,
  activeTab = "menu",
  badgeAnimated = false,
}: HeaderProps) {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoyaltyDrawerOpen, setIsLoyaltyDrawerOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [liveOrders, setLiveOrders] = useState<HeaderOrderSummary[]>([]);
  const prevReadyIdsRef = useRef<Set<number>>(new Set());

  const { user, isAuthenticated, logout, _hasHydrated, refreshProfile } =
    useAuthStore();

  useEffect(() => {
    setIsMounted(true);
    if (isAuthenticated) {
      refreshProfile();
    }
  }, [isAuthenticated, refreshProfile]);

  // Poll /orders/me every 4s so the customer gets notified anywhere on the site when Barista marks READY
  useEffect(() => {
    if (!isMounted || !_hasHydrated || !isAuthenticated) return;
    let active = true;

    const pollMyOrders = () => {
      apiFetch("/orders/me")
        .then((res) => (res.ok ? res.json() : []))
        .then((data: HeaderOrderSummary[]) => {
          if (!active || !Array.isArray(data)) return;
          setLiveOrders(data);

          const currentReadyIds = new Set(
            data.filter((o) => o.status === "READY").map((o) => o.id)
          );
          // Auto-open notification dropdown if a new order just became READY
          if (prevReadyIdsRef.current.size > 0) {
            for (const id of currentReadyIds) {
              if (!prevReadyIdsRef.current.has(id)) {
                setIsNotifOpen(true);
              }
            }
          }
          prevReadyIdsRef.current = currentReadyIds;
        })
        .catch(() => {
          // ignore network error
        });
    };

    pollMyOrders();
    const timer = setInterval(pollMyOrders, 4000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [isMounted, _hasHydrated, isAuthenticated]);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  // Avatar initials from fullName or email
  const initials =
    isMounted && _hasHydrated && user
      ? user.fullName
        ? user.fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : user.email.slice(0, 2).toUpperCase()
      : null;

  const isStaffOrAdmin =
    isMounted &&
    _hasHydrated &&
    user &&
    (user.role === "STAFF" || user.role === "ADMIN");

  const isAdmin =
    isMounted && _hasHydrated && user && user.role === "ADMIN";

  const activeCustomerOrders = liveOrders.filter((o) =>
    ["PAID", "PREPARING", "READY"].includes(o.status)
  );
  const readyCustomerOrders = liveOrders.filter((o) => o.status === "READY");

  return (
    <header className="sticky top-0 z-50 bg-[#FEF8F4]/95 backdrop-blur-md border-b border-[#2C1810]/10">
      {/* Live Pickup Call Bar when any customer order is READY and user is not already on /orders */}
      {isMounted &&
        isAuthenticated &&
        readyCustomerOrders.length > 0 &&
        activeTab !== "orders" && (
          <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-4 py-2 text-xs font-semibold">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base animate-bounce">
                  notifications_active
                </span>
                <span>
                  🔔 <strong>Quầy Barista gọi nhận món:</strong> Đơn{" "}
                  <strong>
                    {readyCustomerOrders.map((o) => `#BL-${o.id}`).join(", ")}
                  </strong>{" "}
                  đã pha chế xong! Mời bạn nhận nước tại{" "}
                  <strong>Kệ Express Bar 04</strong>.
                </span>
              </div>
              <Link
                href={`/order-confirmation?orderId=${readyCustomerOrders[0].id}`}
                className="px-3 py-1 rounded-full bg-white text-emerald-800 hover:bg-emerald-50 font-bold text-[11px] flex items-center gap-1 transition-all"
              >
                <span>Mở mã nhận nước</span>
                <span className="material-symbols-outlined text-xs">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 w-full flex items-center justify-between gap-6">
        {/* Brand Logo & Navigation Links */}
        <div className="flex items-center">
          <Link className="flex items-center" href="/menu">
            <BrewLiteLogo className="h-9 md:h-10 w-auto" />
          </Link>
          <nav className="hidden sm:flex items-center gap-1.5 ml-4">
            <Link
              href="/menu"
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors font-body ${
                activeTab === "menu"
                  ? "bg-[#2C1810] text-[#FEF8F4]"
                  : "text-[#2C1810]/70 hover:text-[#2C1810] hover:bg-[#2C1810]/5"
              }`}
            >
              {"Thực đơn".normalize("NFC")}
            </Link>
            <Link
              href="/orders"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors font-body flex items-center gap-1.5 ${
                activeTab === "orders"
                  ? "bg-[#2C1810] text-[#FEF8F4]"
                  : "text-[#2C1810]/70 hover:text-[#2C1810] hover:bg-[#2C1810]/5"
              }`}
            >
              <span>{"Đơn hàng".normalize("NFC")}</span>
              {isMounted && isAuthenticated && activeCustomerOrders.length > 0 && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold leading-none ${
                    readyCustomerOrders.length > 0
                      ? "bg-emerald-600 text-white animate-pulse"
                      : activeTab === "orders"
                      ? "bg-[#FEBC85] text-[#2C1810]"
                      : "bg-[#845326] text-white"
                  }`}
                >
                  {activeCustomerOrders.length}
                </span>
              )}
            </Link>

            {isStaffOrAdmin && (
              <Link
                href="/staff"
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors font-body flex items-center gap-1 ${
                  activeTab === "staff"
                    ? "bg-[#D97736] text-white"
                    : "bg-[#D97736]/10 text-[#D97736] hover:bg-[#D97736]/20"
                }`}
              >
                <span className="material-symbols-outlined text-xs">
                  coffee_maker
                </span>
                Barista KDS
              </Link>
            )}

            {isAdmin && (
              <Link
                href="/admin"
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors font-body flex items-center gap-1 ${
                  activeTab === "admin"
                    ? "bg-[#2D6A4F] text-white"
                    : "bg-[#2D6A4F]/10 text-[#2D6A4F] hover:bg-[#2D6A4F]/20"
                }`}
              >
                <span className="material-symbols-outlined text-xs">
                  inventory_2
                </span>
                Quản lý Kho
              </Link>
            )}
          </nav>
        </div>

        {/* Global Search & Location Picker */}
        <div className="hidden md:flex items-center gap-3 flex-1 justify-center max-w-xl">
          <div className="w-full max-w-md hidden md:flex items-center justify-between px-4 py-2 bg-[#2C1810]/5 hover:bg-[#2C1810]/10 border border-[#2C1810]/10 rounded-full text-xs text-[#2C1810]/70 transition-all cursor-pointer">
            <div className="flex items-center gap-2 flex-1">
              <span className="material-symbols-outlined text-base">
                search
              </span>
              <input
                type="text"
                placeholder={"Tìm đồ uống, cà phê, hạt rang...".normalize(
                  "NFC"
                )}
                value={onSearchChange ? searchQuery : localSearch}
                onChange={handleSearchInput}
                className="bg-transparent text-xs text-[#1d1b19] placeholder:text-[#827470] focus:outline-none w-full font-body"
              />
            </div>
            <span className="bg-[#e7e1dd] px-1.5 py-0.5 rounded text-[11px] font-bold text-[#504440] font-mono">
              ⌘K
            </span>
          </div>

          <button
            type="button"
            className="flex items-center gap-1 bg-[#f8f2ee] hover:bg-[#f3ede9] px-4 py-1.5 rounded-full text-[#1d1b19] transition-all whitespace-nowrap shrink-0 border border-[#d3c3be]/40 font-body cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-[#febc85] animate-pulse" />
            <span className="text-[11px] font-bold truncate max-w-[140px]">
              Downtown Roastery
            </span>
            <span className="material-symbols-outlined text-sm text-[#504440]">
              expand_more
            </span>
          </button>
        </div>

        {/* Right Quick Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Interactive Live Order Status Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen((prev) => !prev)}
              className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                readyCustomerOrders.length > 0
                  ? "bg-emerald-600 text-white shadow-md"
                  : "bg-[#f8f2ee] hover:bg-[#f3ede9] text-[#1d1b19]"
              }`}
              title="Thông báo tiến độ pha chế"
            >
              <span
                className={`material-symbols-outlined text-xl ${
                  readyCustomerOrders.length > 0 ? "animate-bounce" : ""
                }`}
              >
                {readyCustomerOrders.length > 0
                  ? "notifications_active"
                  : "notifications"}
              </span>
              {isMounted && isAuthenticated && activeCustomerOrders.length > 0 && (
                <span
                  className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    readyCustomerOrders.length > 0
                      ? "bg-amber-400 text-[#2C1810]"
                      : "bg-[#845326] text-white"
                  }`}
                >
                  {activeCustomerOrders.length}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-[#e7e1dd] p-4 z-50">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#f3ede9]">
                  <span className="text-xs font-extrabold text-[#2c1810] uppercase tracking-wider">
                    Thông báo Quầy Barista
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsNotifOpen(false)}
                    className="text-xs text-[#827470] hover:text-[#2c1810]"
                  >
                    ✕
                  </button>
                </div>

                {activeCustomerOrders.length === 0 ? (
                  <p className="text-xs text-[#504440] py-4 text-center">
                    Hiện không có đơn hàng nào đang chờ pha chế.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5 mt-3 max-h-72 overflow-y-auto">
                    {activeCustomerOrders.map((ord) => (
                      <Link
                        key={ord.id}
                        href={`/order-confirmation?orderId=${ord.id}`}
                        onClick={() => setIsNotifOpen(false)}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                          ord.status === "READY"
                            ? "bg-emerald-50 border-emerald-300 hover:bg-emerald-100/70"
                            : "bg-[#f8f2ee] border-[#e7e1dd] hover:bg-[#f3ede9]"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-[#2c1810]">
                            Đơn #BL-{ord.id}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ord.status === "READY"
                                ? "bg-emerald-600 text-white"
                                : ord.status === "PREPARING"
                                ? "bg-[#845326] text-white"
                                : "bg-[#2c1810] text-[#ffdcc2]"
                            }`}
                          >
                            {ord.status === "READY"
                              ? "🔔 Mời lấy nước!"
                              : ord.status === "PREPARING"
                              ? "☕ Đang pha chế"
                              : "⏳ Chờ nhận đơn"}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#504440]">
                          {ord.status === "READY"
                            ? "Đồ uống đã hoàn tất tại Kệ Express Bar 04."
                            : ord.status === "PREPARING"
                            ? "Barista đang chiết xuất đồ uống của bạn."
                            : "Đơn đã gửi xuống màn hình Barista KDS."}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}

                <Link
                  href="/orders"
                  onClick={() => setIsNotifOpen(false)}
                  className="mt-3 w-full py-2 rounded-xl bg-[#2c1810] text-white text-xs font-semibold flex items-center justify-center gap-1 hover:bg-[#351300]"
                >
                  <span>Xem tất cả đơn hàng</span>
                  <span className="material-symbols-outlined text-sm">
                    arrow_forward
                  </span>
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/cart"
            className={`relative flex items-center gap-1.5 bg-[#2c1810] hover:bg-[#351300] text-[#9e7e73] px-4 py-1.5 rounded-full transition-all active:scale-95 font-body ${
              badgeAnimated ? "scale-105" : ""
            }`}
            title={"Giỏ hàng".normalize("NFC")}
          >
            <span className="material-symbols-outlined text-xl text-white">
              shopping_bag
            </span>
            <span
              className={`text-[13px] font-bold text-white font-body transition-transform ${
                badgeAnimated ? "scale-125" : "scale-100"
              }`}
            >
              {isMounted ? cartCount : 0}
            </span>
          </Link>

          {isMounted && _hasHydrated && isAuthenticated && user ? (
            /* ── Đã đăng nhập: Loyalty Points + Avatar + tên + nút đăng xuất ── */
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsLoyaltyDrawerOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D97736]/10 hover:bg-[#D97736]/20 text-[#D97736] border border-[#D97736]/20 text-xs font-semibold whitespace-nowrap font-body transition-colors cursor-pointer"
                title="Bấm để mở Thẻ thành viên & Đổi ưu đãi Hạt Vàng"
              >
                <span>
                  ⭐ {(user.loyaltyPoints ?? 0).toLocaleString("vi-VN")} Hạt Vàng
                </span>
              </button>
              <div className="flex items-center gap-2">
                {/* Avatar circle với initials */}
                <button
                  type="button"
                  onClick={() => setIsLoyaltyDrawerOpen(true)}
                  className="w-8 h-8 rounded-full bg-[#2c1810] hover:bg-[#3d2318] flex items-center justify-center ring-2 ring-[#ede7e3] cursor-pointer transition-transform active:scale-95"
                >
                  <span className="text-[11px] font-bold text-white font-body">
                    {initials}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            /* ── Chưa đăng nhập: nút Đăng nhập ── */
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-[#f8f2ee] hover:bg-[#f3ede9] border border-[#d3c3be]/50 text-[#2c1810] px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all font-body"
            >
              <span className="material-symbols-outlined text-sm">person</span>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {/* ── Stitch Loyalty Drawer Modal ── */}
      <LoyaltyDrawer
        isOpen={isLoyaltyDrawerOpen}
        onClose={() => setIsLoyaltyDrawerOpen(false)}
      />
    </header>
  );
}

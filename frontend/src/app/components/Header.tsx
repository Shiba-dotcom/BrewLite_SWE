"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import BrewLiteLogo from "./BrewLiteLogo";
import { useAuthStore } from "../store/authStore";

export interface HeaderProps {
  cartCount?: number;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  activeTab?: "menu" | "orders";
  badgeAnimated?: boolean;
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

  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  // Avatar initials from fullName or email
  const initials = isMounted && _hasHydrated && user
    ? (user.fullName
        ? user.fullName
            .split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()
        : user.email.slice(0, 2).toUpperCase())
    : null;

  return (
    <header className="sticky top-0 z-50 bg-[#FEF8F4]/90 backdrop-blur-md border-b border-[#2C1810]/10 px-4 py-3">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between gap-6">
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
              href="#"
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors font-body ${
                activeTab === "orders"
                  ? "bg-[#2C1810] text-[#FEF8F4]"
                  : "text-[#2C1810]/70 hover:text-[#2C1810] hover:bg-[#2C1810]/5"
              }`}
            >
              {"Đơn hàng".normalize("NFC")}
            </Link>
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
          <button
            type="button"
            className="relative w-10 h-10 rounded-full flex items-center justify-center bg-[#f8f2ee] hover:bg-[#f3ede9] text-[#1d1b19] transition-all cursor-pointer"
            title="Thông báo"
          >
            <span className="material-symbols-outlined text-xl">
              notifications
            </span>
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#845326]" />
          </button>

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
            /* ── Đã đăng nhập: Avatar + tên + nút đăng xuất ── */
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D97736]/10 text-[#D97736] border border-[#D97736]/20 text-xs font-semibold whitespace-nowrap font-body">
                <span>{"⭐ 120 điểm".normalize("NFC")}</span>
              </div>
              <div className="flex items-center gap-2 group relative">
                {/* Avatar circle với initials */}
                <div className="w-8 h-8 rounded-full bg-[#2c1810] flex items-center justify-center ring-2 ring-[#ede7e3] cursor-pointer">
                  <span className="text-[11px] font-bold text-white font-body">
                    {initials}
                  </span>
                </div>
                {/* Dropdown on hover */}
                <div className="absolute right-0 top-10 bg-white rounded-2xl shadow-lg border border-[#ede7e3] p-3 min-w-[180px] opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity z-50">
                  <p className="text-[13px] font-semibold text-[#1d1b19] font-body truncate">
                    {user.fullName ?? user.email}
                  </p>
                  <p className="text-[11px] text-[#827470] font-body truncate mb-2">
                    {user.email}
                  </p>
                  <button
                    type="button"
                    onClick={logout}
                    className="w-full flex items-center gap-1.5 text-[12px] font-semibold text-red-600 hover:bg-red-50 px-2 py-1.5 rounded-lg transition-colors font-body"
                  >
                    <span className="material-symbols-outlined text-sm">
                      logout
                    </span>
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ── Chưa đăng nhập: nút Đăng nhập ── */
            <>
              <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D97736]/10 text-[#D97736] border border-[#D97736]/20 text-xs font-semibold whitespace-nowrap font-body">
                <span>{"⭐ 120 điểm".normalize("NFC")}</span>
              </div>
              <Link
                href="/login"
                className="flex items-center gap-1.5 bg-[#f8f2ee] hover:bg-[#f3ede9] border border-[#d3c3be]/50 text-[#2c1810] px-3 py-1.5 rounded-full text-xs font-semibold transition-all font-body"
              >
                <span className="material-symbols-outlined text-sm">
                  person
                </span>
                Đăng nhập
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

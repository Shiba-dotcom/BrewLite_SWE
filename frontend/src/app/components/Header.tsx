"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import BrewLiteLogo from "./BrewLiteLogo";

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
                placeholder={"Tìm đồ uống, cà phê, hạt rang...".normalize("NFC")}
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

        {/* Right Quick Controls: Notification, Cart, Loyalty, Profile */}
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

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D97736]/10 text-[#D97736] border border-[#D97736]/20 text-xs font-semibold whitespace-nowrap font-body">
            <span>{"⭐ 120 điểm".normalize("NFC")}</span>
          </div>

          {/* Original Google Stitch Avatar Asset */}
          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-[#ede7e3]">
            <Image
              alt="Profile"
              src="https://lh3.googleusercontent.com/aida/AEtjO1VeNmJ7fNrlOsKRDCp-paWPp28u_ONFRs411sz930XjQrQBNjra7iOYMYqp9QNdUOzQEI29k_s1q2kKn_wZ0WgjjAyP4mxkpxkgDI5Py7jJZYmWHYYkRUyS_U9hoFMK3NpNPt7glbxb2KUa8t-9ECy8_ehEASrNhWWvgJMfTkViWYPA0IwF99vCWCiYJsDIsKPn-wP75woSuq6WiWKsGVB6WNaH7pK7uZvVAq7NzE9VU3TpdCipzqc2kk9t"
              fill
              sizes="32px"
              className="object-cover"
              unoptimized
            />
          </div>
        </div>
      </div>
    </header>
  );
}

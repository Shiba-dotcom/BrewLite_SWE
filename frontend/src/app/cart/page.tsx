"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  Snowflake,
  Flame,
  Trash2,
  Pencil,
  Store,
  Clock,
  Tag,
  CheckCircle2,
  Plus,
  Minus,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Leaf,
  Sparkles,
  Coffee,
  X,
  Ticket,
  AlertCircle,
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductDetailModal, { CustomizationDetails } from "../components/ProductDetailModal";
import VoucherModal from "../components/VoucherModal";
import { DEFAULT_PRODUCTS, Product } from "../menu/page";
import { useCartStore, CartItem, isBakeryProduct } from "../store/cartStore";
import { useAuthStore, apiFetch } from "../store/authStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function vnd(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

const FALLBACK_IMG = "/images/products/ca-phe-sua.png";

/** Suggested add-on items (Các bánh đang có trong đồ án) */
const SUGGESTED = [
  {
    id: 8,
    name: "Bánh Pain au Chocolat",
    desc: "Vỏ ngàn lớp giòn xốp ôm thanh socola Bỉ".normalize("NFC"),
    price: 39000,
    img: "/images/products/pain-au-chocolat.png",
  },
  {
    id: 9,
    name: "Basque Burnt Cheesecake",
    desc: "Phô mai nướng cháy xém phong cách xứ Basque".normalize("NFC"),
    price: 45000,
    img: "/images/products/basque-burnt-cheesecake.png",
  },
  {
    id: 10,
    name: "Classic Tiramisu",
    desc: "Cốt ladyfinger đẫm espresso & mascarpone".normalize("NFC"),
    price: 49000,
    img: "/images/products/classic-tiramisu.png",
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

/**
 * 1. Pill badge for base attributes: size / ice / temp / sweetness
 * Standard: text-stone-900 on bg-[#f5f0eb] border-[#e8dfd5]
 */
function AttributeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-[#f5f0eb] text-stone-900 border border-[#e8dfd5] text-xs font-medium px-2.5 py-1 rounded-full font-body whitespace-nowrap">
      {children}
    </span>
  );
}

/**
 * 1. Pill badge for paid add-on toppings
 * Distinct warm honey/caramel tone: bg-[#fef3c7] text-[#92400e] border-[#fde68a]
 */
function ToppingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[#fef3c7] text-[#92400e] border border-[#fde68a] font-semibold text-xs px-2.5 py-1 rounded-full font-body whitespace-nowrap shadow-2xs">
      {children}
    </span>
  );
}

/** Quantity stepper */
function Stepper({
  qty,
  onDec,
  onInc,
}: {
  qty: number;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onDec}
        aria-label="Giảm số lượng"
        className="w-8 h-8 rounded-full border border-stone-300 flex items-center justify-center text-stone-700 hover:border-[#2c1810] hover:text-[#2c1810] transition-colors active:scale-90"
      >
        <Minus size={14} strokeWidth={2.5} />
      </button>
      <span className="w-6 text-center text-[15px] font-bold text-[#1d1b19] font-body select-none tabular-nums">
        {qty}
      </span>
      <button
        type="button"
        onClick={onInc}
        aria-label="Tăng số lượng"
        className="w-8 h-8 rounded-full bg-[#2c1810] flex items-center justify-center text-white hover:bg-[#845326] transition-colors active:scale-90"
      >
        <Plus size={14} strokeWidth={2.5} />
      </button>
    </div>
  );
}

/** Format ice level display according to rules:
 * - 100% -> "100% đá"
 * - 70% / Ít đá -> "70% đá"
 * - 50% -> "50% đá"
 * - 0% / Không đá -> "Không đá"
 */
function formatIceLevel(ice?: string): string {
  if (!ice) return "100% đá";
  const val = ice.trim();
  if (val.includes("100%")) return "100% đá";
  if (val.includes("70%")) return "70% đá";
  if (val.includes("50%")) return "50% đá";
  if (
    val.includes("0%") ||
    val.toLowerCase().includes("không") ||
    val.toLowerCase().includes("khong")
  ) {
    return "Không đá";
  }
  return val;
}

/** Format sugar level display according to rules:
 * - 100% -> "100% đường"
 * - 70% -> "70% đường"
 * - 50% -> "50% đường"
 * - 0% / Không đường -> "Không đường"
 */
function formatSugarLevel(sugar?: string): string {
  if (!sugar) return "100% đường";
  const val = sugar.trim();
  if (
    val === "0%" ||
    val.toLowerCase().includes("không") ||
    val.toLowerCase().includes("khong")
  ) {
    return "Không đường";
  }
  if (val.endsWith("%")) {
    return `${val} đường`;
  }
  if (
    !val.toLowerCase().includes("đường") &&
    !val.toLowerCase().includes("duong")
  ) {
    return `${val} đường`;
  }
  return val;
}

/** Single cart item card */
function CartItemCard({
  item,
  onUpdateQty,
  onRequestDelete,
  onEdit,
}: {
  item: CartItem;
  onUpdateQty: (qty: number) => void;
  onRequestDelete: (item: CartItem) => void;
  onEdit: (item: CartItem) => void;
}) {
  const isBakery = item.isBakery || isBakeryProduct(item);
  const isWarm =
    item.servingStyle === "Hâm nóng" ||
    item.servingStyle === "Hâm nóng giòn" ||
    (!item.servingStyle && (item.temperature === "HOT" || item.temp?.toLowerCase() === "hot"));
  const isHot =
    item.temperature === "HOT" ||
    item.temp?.toLowerCase() === "hot";
  const totalLinePrice = item.price * item.quantity;

  return (
    <article className="bg-white rounded-2xl shadow-xs border border-stone-100 p-4 flex gap-4 transition-all duration-300 hover:shadow-sm">
      {/* Thumbnail */}
      <div className="relative w-[88px] h-[88px] rounded-xl overflow-hidden bg-[#ede7e3] shrink-0">
        <Image
          src={item.imageUrl || FALLBACK_IMG}
          alt={item.name}
          fill
          unoptimized
          loading="eager"
          sizes="88px"
          className="object-cover"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-2">
        {/* Row 1: Name + Edit & Trash Buttons */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-headline text-[15px] font-bold text-[#1d1b19] leading-snug truncate">
              {item.name}
            </h3>
          </div>

          {/* Action buttons: Edit & Trash */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onEdit(item)}
              aria-label={`Chỉnh sửa ${item.name}`}
              title="Chỉnh sửa món"
              className="text-stone-800 hover:text-amber-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors"
            >
              <Pencil size={15} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => onRequestDelete(item)}
              aria-label={`Xóa ${item.name}`}
              title="Xóa món"
              className="text-stone-800 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 size={15} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Dòng 1: Tùy chọn cơ bản */}
        <div className="flex flex-wrap items-center gap-1.5">
          {isBakery ? (
            <>
              {/* Cách phục vụ */}
              {isWarm ? (
                <AttributeBadge>
                  <Flame size={12} className="text-stone-900" strokeWidth={2.2} />
                  <span>{"Hâm nóng".normalize("NFC")}</span>
                </AttributeBadge>
              ) : (
                <AttributeBadge>
                  <Snowflake size={12} className="text-stone-900" strokeWidth={2.2} />
                  <span>{"Dùng ngay".normalize("NFC")}</span>
                </AttributeBadge>
              )}
            </>
          ) : (
            <>
              {/* 1. Kích thước (Size S/M/L) */}
              {item.size && (
                <AttributeBadge>Size {item.size}</AttributeBadge>
              )}

              {/* 2. Nhiệt độ (Uống Nóng / Uống Lạnh) */}
              {isHot ? (
                <AttributeBadge>
                  <Flame size={12} className="text-stone-900" strokeWidth={2.2} />
                  <span>{"Uống Nóng".normalize("NFC")}</span>
                </AttributeBadge>
              ) : (
                <AttributeBadge>
                  <Snowflake size={12} className="text-stone-900" strokeWidth={2.2} />
                  <span>{"Uống Lạnh".normalize("NFC")}</span>
                </AttributeBadge>
              )}

              {/* 3. Lượng đá: Uống Nóng ẩn hoàn toàn; Uống Lạnh hiển thị tag tương ứng */}
              {!isHot && (
                <AttributeBadge>
                  <span>{formatIceLevel(item.iceLevel)}</span>
                </AttributeBadge>
              )}

              {/* 4. Mức đường: Luôn hiển thị */}
              <AttributeBadge>
                <span>{formatSugarLevel(item.sugarLevel)}</span>
              </AttributeBadge>
            </>
          )}
        </div>

        {/* Dòng 2: Topping đi kèm (Cứ 2 topping xuống 1 dòng) */}
        {item.toppings && item.toppings.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {chunkArray(item.toppings, 2).map((pair, pIdx) => (
              <div key={pIdx} className="flex flex-wrap items-center gap-1.5">
                {pair.map((t) => (
                  <ToppingBadge key={t}>
                    <span className="text-[11px] font-bold">+</span>
                    <span>{t}</span>
                  </ToppingBadge>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Row 3: Price + Stepper */}
        <div className="flex items-end justify-between gap-2 mt-1">
          <div className="flex items-baseline gap-2">
            <span className="font-body text-[17px] font-bold text-[#1d1b19]">
              {vnd(totalLinePrice)}
            </span>
            {item.quantity > 1 && (
              <span className="text-[11px] text-stone-400 font-body">
                {"Đơn giá: ".normalize("NFC")}
                {vnd(item.price)}
              </span>
            )}
          </div>

          <Stepper
            qty={item.quantity}
            onDec={() => onUpdateQty(item.quantity - 1)}
            onInc={() => onUpdateQty(item.quantity + 1)}
          />
        </div>

        {/* Notes */}
        {item.notes && (
          <p className="text-[11px] text-stone-500 font-body italic border-t border-stone-100 pt-1.5 line-clamp-1">
            <span className="not-italic font-semibold text-stone-600">
              Ghi chú:
            </span>{" "}
            {item.notes}
          </p>
        )}
      </div>
    </article>
  );
}

export const CartItemRow = CartItemCard;
export { CartItemCard };

// ─── Sidebar Cards ───────────────────────────────────────────────────────────

/** Card 1: Pickup location */
function LocationCard() {
  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-xs p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#f4efe6] flex items-center justify-center">
            <Store size={16} className="text-[#845326]" strokeWidth={1.75} />
          </div>
          <span className="font-headline text-[14px] font-bold text-[#1d1b19]">
            {"Địa điểm nhận món".normalize("NFC")}
          </span>
        </div>
        <button
          type="button"
          className="text-[12px] font-semibold text-[#845326] hover:text-[#2c1810] transition-colors font-body flex items-center gap-0.5"
        >
          {"Đổi chi nhánh".normalize("NFC")}
          <ChevronRight size={13} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col gap-1 pl-1">
        <span className="font-body text-[14px] font-bold text-[#1d1b19]">
          Downtown Roastery Bar
        </span>
        <span className="text-[12px] text-stone-500 font-body">
          124 Lê Lợi, Phường Bến Nghé, Quận 1, TP.HCM
        </span>
      </div>

      <div className="flex items-center gap-2 bg-[#f8f2ee] rounded-xl px-3 py-2">
        <Clock size={13} className="text-[#845326] shrink-0" strokeWidth={2} />
        <span className="text-[12px] text-stone-600 font-body">
          {"Thời gian pha chế dự kiến: ".normalize("NFC")}
          <strong className="text-[#2c1810]">~5 phút</strong>
          {" sau khi đặt".normalize("NFC")}
        </span>
      </div>
    </div>
  );
}

/** Card 2: Promo code */
export interface VoucherItem {
  code: string;
  description: string;
  discountPercent: number;
  minOrderAmount: number;
  quantity?: number;
}

function PromoCard({
  appliedCode,
  appliedPercent,
  vouchers,
  matchedVoucher,
  onApply,
  onRemove,
  onOpenModal,
  subtotal,
  discountAmount,
}: {
  appliedCode: string | null;
  appliedPercent?: number;
  discountAmount?: number;
  vouchers?: VoucherItem[];
  matchedVoucher?: VoucherItem | null;
  subtotal: number;
  onApply: (code: string) => void;
  onRemove: () => void;
  onOpenModal: () => void;
}) {
  const [inputCode, setInputCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isUnderMin = Boolean(
    matchedVoucher?.minOrderAmount && subtotal < matchedVoucher.minOrderAmount
  );
  const missingAmount = isUnderMin
    ? (matchedVoucher?.minOrderAmount || 0) - subtotal
    : 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) return;
    const clean = inputCode.trim().toUpperCase();

    // Validate code
    const found = vouchers?.find((v) => v.code === clean);
    if (
      !found &&
      clean !== "BREWCOZY" &&
      clean !== "BREW10" &&
      clean !== "BREWLITE10"
    ) {
      setErrorMessage(`Mã giảm giá "${clean}" không tồn tại hoặc đã hết hạn.`);
      return;
    }

    if (found && found.minOrderAmount && subtotal < found.minOrderAmount) {
      const missing = found.minOrderAmount - subtotal;
      setErrorMessage(
        `Mã "${clean}" yêu cầu đơn tối thiểu ${found.minOrderAmount.toLocaleString(
          "vi-VN"
        )}đ (còn thiếu ${missing.toLocaleString("vi-VN")}đ).`
      );
      return;
    }

    setErrorMessage(null);
    onApply(clean);
    setInputCode("");
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-xs p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#f4efe6] flex items-center justify-center">
            <Tag size={15} className="text-[#845326]" strokeWidth={1.75} />
          </div>
          <span className="font-headline text-[14px] font-bold text-[#1d1b19]">
            {"Mã giảm giá ưu đãi".normalize("NFC")}
          </span>
        </div>

        {/* Voucher count pill */}
        <button
          type="button"
          onClick={onOpenModal}
          className="inline-flex items-center gap-1 text-[11px] font-bold text-[#845326] hover:text-[#5a3414] transition-colors cursor-pointer"
        >
          <span>{vouchers?.reduce((s, x) => s + (x.quantity || 1), 0) || 0} mã khả dụng</span>
          <ChevronRight size={13} />
        </button>
      </div>

      {!appliedCode ? (
        <div className="flex flex-col gap-2.5">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => {
                setInputCode(e.target.value.toUpperCase());
                if (errorMessage) setErrorMessage(null);
              }}
              placeholder={"Nhập mã ưu đãi (VD: BREW10)".normalize("NFC")}
              id="promoCodeInput"
              className="flex-1 px-3.5 py-2.5 text-[13px] bg-[#f8f2ee] border border-stone-200 rounded-xl focus:outline-hidden focus:border-[#845326] focus:bg-white text-[#1d1b19] placeholder:text-stone-400 font-body transition-colors uppercase font-mono"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-[#221811] hover:bg-[#2c1810] text-white text-[13px] font-bold rounded-xl transition-colors font-body whitespace-nowrap active:scale-95 cursor-pointer"
            >
              {"Áp dụng".normalize("NFC")}
            </button>
          </form>

          {errorMessage && (
            <p className="text-[11px] text-red-600 font-medium flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle size={13} className="shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </p>
          )}

          {/* Clean Voucher Modal Trigger Button */}
          <button
            type="button"
            onClick={onOpenModal}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-[#FAF0E6]/70 hover:bg-[#FAF0E6] border border-[#845326]/20 text-left transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2.5 text-[#845326]">
              <Ticket size={16} />
              <div className="flex flex-col">
                <span className="text-xs font-bold font-body leading-tight">
                  {"Chọn hoặc đổi mã giảm giá".normalize("NFC")}
                </span>
                <span className="text-[10px] text-stone-500 font-body">
                  {"Dùng Hạt Vàng hoặc áp dụng mã sẵn có".normalize("NFC")}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-[#845326]">
              <span>{"Chọn mã".normalize("NFC")}</span>
              <ChevronRight
                size={14}
                className="group-hover:translate-x-0.5 transition-transform"
              />
            </div>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2 bg-[#fffaf5] border border-[#f3d5ba] rounded-2xl p-3.5 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-[#845326] text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Tag size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-bold text-xs bg-[#2c1810] text-white px-2 py-0.5 rounded-md">
                    {appliedCode}
                  </span>
                  <span className="text-xs font-bold text-[#845326]">
                    -{appliedPercent ?? 15}%
                  </span>
                </div>
                {isUnderMin ? (
                  <p className="text-[11px] text-amber-700 font-medium font-body mt-0.5 flex items-center gap-1">
                    <AlertCircle size={12} className="shrink-0 text-amber-600" />
                    <span>Thiếu {vnd(missingAmount)} để được giảm</span>
                  </p>
                ) : (
                  <p className="text-[11px] text-stone-500 font-body mt-0.5 truncate">
                    {discountAmount && discountAmount > 0
                      ? `Đã giảm -${vnd(discountAmount)} vào đơn hàng`
                      : "Đã kích hoạt ưu đãi vào đơn"}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onOpenModal}
                className="px-2.5 py-1 text-[11px] font-bold text-[#845326] hover:bg-[#FAF0E6] rounded-lg transition-colors cursor-pointer"
              >
                {"Đổi mã".normalize("NFC")}
              </button>
              <button
                type="button"
                onClick={onRemove}
                aria-label={"Gỡ mã".normalize("NFC")}
                className="p-1.5 rounded-lg hover:bg-stone-200 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
              >
                <X size={15} strokeWidth={2.2} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Card 3: Order summary + CTA
 * Requirement 3: Bổ sung mục "Ưu đãi" nổi bật với màu cam đất/đỏ (-24.600đ),
 * Phí ly Eco 0đ, VAT, Tích luỹ hạt thưởng, Tổng cộng to đậm.
 */
function SummaryCard({
  subtotal,
  itemCount,
  discount,
  promoCode,
  matchedVoucher,
  onCheckout,
  isLoading,
  error,
}: {
  subtotal: number;
  itemCount: number;
  discount: number;
  promoCode: string | null;
  matchedVoucher?: VoucherItem | null;
  onCheckout: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const ECO_FEE = 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  // Thuế VAT 8% áp dụng vào giá tạm tính
  const vat = Math.floor(afterDiscount * 0.08);
  // Làm tròn xuống hàng nghìn VNĐ (ví dụ 144.720đ -> 144.000đ)
  const total = Math.floor((afterDiscount + vat + ECO_FEE) / 1000) * 1000;
  const loyaltyPoints = Math.floor(total / 1000);

  const isUnderMin = Boolean(
    promoCode &&
      matchedVoucher?.minOrderAmount &&
      subtotal < matchedVoucher.minOrderAmount
  );
  const missingAmount = isUnderMin
    ? (matchedVoucher?.minOrderAmount || 0) - subtotal
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-xs p-5 flex flex-col gap-4">
      <span className="font-headline text-[14px] font-bold text-[#1d1b19]">
        {"Tóm tắt thanh toán".normalize("NFC")}
      </span>

      {/* Warning if promo code is active but min order not reached */}
      {isUnderMin && matchedVoucher && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle size={15} className="shrink-0 text-amber-600 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold leading-tight">
              Mã <span className="font-mono">{promoCode}</span> chưa đủ điều kiện
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5">
              Yêu cầu đơn tối thiểu {vnd(matchedVoucher.minOrderAmount || 0)}. Mua thêm <strong>{vnd(missingAmount)}</strong> để được giảm {matchedVoucher.discountPercent}%!
            </p>
          </div>
        </div>
      )}

      {/* Line items */}
      <div className="flex flex-col gap-2.5 text-[13px] font-body">
        {/* Tạm tính */}
        <div className="flex justify-between text-stone-600">
          <span>
            {"Tạm tính".normalize("NFC")} ({itemCount} {"món".normalize("NFC")})
          </span>
          <span className="font-medium text-stone-900">{vnd(subtotal)}</span>
        </div>

        {/* Ưu đãi Giờ vàng / Khuyến mại (Hiển thị số âm nổi bật màu cam đất/đỏ) */}
        {discount > 0 && (
          <div className="flex justify-between text-[#b45309] font-semibold">
            <span className="flex items-center gap-1">
              {"Ưu đãi Giờ vàng / Khuyến mại".normalize("NFC")}
              {promoCode && (
                <span className="text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.2 rounded font-mono">
                  {promoCode}
                </span>
              )}
            </span>
            <span className="font-bold">-{vnd(discount)}</span>
          </div>
        )}

        {/* Phí ly & đóng gói Eco */}
        <div className="flex justify-between text-stone-600">
          <span>{"Phí ly & đóng gói Eco".normalize("NFC")}</span>
          <span className="text-[#2c1810] font-semibold">
            {"0đ (Miễn phí)".normalize("NFC")}
          </span>
        </div>

        {/* VAT */}
        <div className="flex justify-between text-stone-600">
          <span>{"Thuế VAT (8%)".normalize("NFC")}</span>
          <span className="text-stone-800 font-medium">{vnd(vat)}</span>
        </div>

        {/* Tích luỹ hạt thưởng */}
        <div className="flex justify-between items-center pt-1 border-t border-dashed border-stone-100">
          <span className="text-stone-600">{"Tích luỹ hạt thưởng".normalize("NFC")}</span>
          <span className="inline-flex items-center gap-1.5 text-[#b45309] font-bold text-[12px]">
            <Sparkles size={13} className="text-amber-500 fill-amber-400" />
            <span>+{loyaltyPoints} {"Hạt Vàng".normalize("NFC")}</span>
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-stone-100" />

      {/* Tổng cộng */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-stone-400 font-body uppercase tracking-wider font-bold">
              {"Tổng cộng".normalize("NFC")}
            </p>
            <span className="text-[11px] text-stone-400 font-body font-medium">
              {"(đã làm tròn)".normalize("NFC")}
            </span>
          </div>
        </div>
        <span className="text-2xl font-bold text-stone-900 leading-tight">
          {vnd(total)}
        </span>
      </div>

      {/* Primary CTA */}
      {error && (
        <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 font-body">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onCheckout}
        disabled={itemCount === 0 || isLoading}
        id="proceedToCheckoutBtn"
        className="w-full flex items-center justify-between gap-2 bg-[#221811] hover:bg-[#2c1810] disabled:opacity-40 disabled:cursor-not-allowed text-white px-5 py-3.5 rounded-xl transition-all active:scale-[0.98] shadow-md font-body"
      >
        <span className="text-[14px] font-bold">
          {isLoading ? "Đang xử lý...".normalize("NFC") : "Tiến hành Thanh toán".normalize("NFC")}
        </span>
        <div className="flex items-center gap-1.5">
          {!isLoading && <span className="text-[14px] font-bold">{vnd(total)}</span>}
          <ArrowRight size={16} strokeWidth={2.5} className={isLoading ? "animate-spin" : ""} />
        </div>
      </button>

      {/* Secondary CTA */}
      <Link
        href="/menu"
        className="w-full flex items-center justify-center gap-1.5 bg-[#f5f2eb] hover:bg-[#eae5da] text-stone-800 px-5 py-3 rounded-xl transition-colors font-body text-[13px] font-semibold"
      >
        <Plus size={14} strokeWidth={2.5} />
        {"Tiếp tục chọn món".normalize("NFC")}
      </Link>

      {/* Fine print */}
      <p className="text-[11px] text-stone-400 text-center font-body leading-relaxed">
        <Leaf size={11} className="inline mr-1 text-green-600" strokeWidth={2} />
        {"BrewLite áp dụng quầy 100% Cashless".normalize("NFC")}
        {" • "}
        {"Nhận đồ uống không chờ đợi".normalize("NFC")}
      </p>
    </div>
  );
}

/** Suggested items section */
function SuggestedItems({ onAdd }: { onAdd: (item: (typeof SUGGESTED)[0]) => void }) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles size={14} className="text-amber-500 fill-amber-400" strokeWidth={2} />
        <h3 className="font-headline text-[14px] font-bold text-[#1d1b19]">
          {"Món gợi ý dùng kèm".normalize("NFC")}
        </h3>
      </div>
      <div className="flex flex-col gap-2">
        {SUGGESTED.map((s) => (
          <div
            key={s.id}
            className="flex items-center gap-3 bg-white rounded-xl border border-stone-100 p-3"
          >
            <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-[#ede7e3] shrink-0">
              <Image
                src={s.img}
                alt={s.name}
                fill
                unoptimized
                sizes="48px"
                className="object-cover"
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#1d1b19] font-body truncate">
                {s.name}
              </p>
              <p className="text-[11px] text-stone-400 font-body truncate">{s.desc}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[13px] font-bold text-[#1d1b19] font-body">
                {vnd(s.price)}
              </span>
              <button
                type="button"
                onClick={() => onAdd(s)}
                className="w-7 h-7 rounded-full bg-[#2c1810] hover:bg-[#845326] text-white flex items-center justify-center transition-colors active:scale-90"
                aria-label={`Thêm ${s.name}`}
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 2. Empty Cart state:
 * - Font sans standard to prevent Vietnamese diacritics detachment ("trống" vs "trố´ ng")
 * - Single centered button "Xem Menu ngay", removed "Khôi phục đơn mẫu"
 */
function EmptyCart() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 px-4 text-center">
      {/* Line-art coffee cup outline in large beige circle */}
      <div className="w-24 h-24 rounded-full bg-[#f0ebe1] flex items-center justify-center text-stone-700 shadow-2xs">
        <Coffee size={42} strokeWidth={1.5} className="text-stone-800" />
      </div>

      {/* Font-sans Title & description */}
      <div className="max-w-md">
        <h2 className="font-sans font-bold text-stone-900 text-2xl mb-2">
          {"Giỏ hàng của bạn đang trống".normalize("NFC")}
        </h2>
        <p className="text-stone-600 text-sm leading-relaxed font-body">
          {"Hãy bắt đầu ngày mới với một tách cà phê hoặc trà tại BrewLite.".normalize(
            "NFC"
          )}
        </p>
      </div>

      {/* Single centered button */}
      <div className="flex justify-center pt-2">
        <Link
          href="/menu"
          className="bg-[#221811] text-white px-6 py-3 rounded-xl font-medium hover:bg-stone-800 transition active:scale-95 shadow-xs font-body inline-flex items-center gap-2"
        >
          <span>{"Xem Menu ngay".normalize("NFC")}</span>
          <ArrowRight size={15} strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

// ─── Main Cart Page ──────────────────────────────────────────────────────────
export default function CartPage() {
  const {
    items,
    updateQuantity,
    updateCartItem,
    removeItem,
    clearCart,
    getKey,
    cartCount,
    cartTotal,
    addItem,
    appliedPromo,
    setAppliedPromo,
  } = useCartStore();

  const { user, refreshProfile } = useAuthStore();
  const [hydrated, setHydrated] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [availableVouchers, setAvailableVouchers] = useState<VoucherItem[]>([
    { code: "BREWCOZY", description: "Giờ vàng -15%", discountPercent: 15, minOrderAmount: 0, quantity: 1 },
    { code: "BREW10", description: "Ưu đãi thành viên -10%", discountPercent: 10, minOrderAmount: 0, quantity: 1 },
  ]);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const router = useRouter();

  // State for delete confirmation modal
  const [itemToDelete, setItemToDelete] = useState<CartItem | null>(null);
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  // 4. State for editing item in ProductDetailModal
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  useEffect(() => {
    setHydrated(true);
    refreshProfile?.();
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
          { code: "BREWCOZY", description: "Giờ vàng -15%", discountPercent: 15, minOrderAmount: 0, quantity: 1 },
          { code: "BREW10", description: "Ưu đãi thành viên -10%", discountPercent: 10, minOrderAmount: 0, quantity: 1 },
        ];
        if (data && Array.isArray(data.vouchers) && data.vouchers.length > 0) {
          baseList = data.vouchers.map((v: VoucherItem) => ({ ...v, quantity: v.quantity || 1 }));
        }

        // Đồng bộ cộng dồn các mã người dùng đã đổi
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

        setAvailableVouchers(merged);
      })
      .catch(() => {
        // Fallback to static vouchers
      });
  }, [vouchersKey]);

  const handleRedeemSuccess = (code: string, newQty?: number) => {
    setAvailableVouchers((prev) => {
      const idx = prev.findIndex((v) => v.code === code);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: typeof newQty === "number" ? newQty : (next[idx].quantity || 1) + 1,
        };
        return next;
      } else {
        const reward =
          code === "BREW50"
            ? { pct: 50, min: 80000 }
            : code === "BREW20"
            ? { pct: 20, min: 50000 }
            : { pct: 10, min: 0 };
        return [
          ...prev,
          {
            code,
            description: `Ưu đãi ${code}`,
            discountPercent: reward.pct,
            minOrderAmount: reward.min,
            quantity: typeof newQty === "number" ? newQty : 1,
          },
        ];
      }
    });
  };

  const count = hydrated ? cartCount() : 0;
  const subtotal = hydrated ? cartTotal() : 0;
  const displayItems = hydrated ? items : [];

  // Calculate discount based on dynamic promo code configured by Admin (or fallback)
  const matchedVoucher = availableVouchers.find((v) => v.code === appliedPromo);
  const discountRate = matchedVoucher
    ? matchedVoucher.discountPercent / 100
    : appliedPromo === "BREWCOZY"
      ? 0.15
      : appliedPromo === "BREW10"
        ? 0.1
        : 0;
  const discountAmount =
    matchedVoucher && subtotal < (matchedVoucher.minOrderAmount || 0)
      ? 0
      : Math.round(subtotal * discountRate);

  // Match the product for editing in modal
  const editingProduct: Product | null = useMemo(() => {
    if (!editingItem) return null;
    const found = DEFAULT_PRODUCTS.find((p) => p.id === editingItem.id);
    if (found) return found;
    return {
      id: editingItem.id,
      name: editingItem.name,
      description: null,
      imageUrl: editingItem.imageUrl || null,
      basePrice: editingItem.price,
      chips: {
        temps: editingItem.temp === "hot" ? ["Hot"] : ["Iced", "Hot"],
      },
    };
  }, [editingItem]);

  const handleCheckout = async () => {
    if (!displayItems.length) return;

    // ── Auth Guard: redirect sang /login nếu chưa đăng nhập ──
    const { isAuthenticated } = useAuthStore.getState();
    if (!isAuthenticated) {
      router.push("/login?redirect=/cart");
      return;
    }

    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const payload = {
        items: displayItems.map((item) => ({
          productId: item.id,
          productName: item.name,
          size: item.size ?? "M",
          toppings: item.toppings ?? [],
          quantity: item.quantity,
          unitPrice: item.price,
        })),
        discountCode: appliedPromo || undefined,
      };
      // Tự động hủy đơn nháp cũ nếu khách hàng quay lại giỏ và bấm đặt lại (tránh sinh đơn ảo rác)
      if (typeof window !== "undefined") {
        const prevPendingId = sessionStorage.getItem("brewlite_active_pending_order");
        if (prevPendingId) {
          apiFetch(`/orders/${prevPendingId}/status`, {
            method: "PATCH",
            body: JSON.stringify({ status: "CANCELLED" }),
          }).catch(() => {});
          sessionStorage.removeItem("brewlite_active_pending_order");
        }
      }

      // apiFetch tự động đính kèm Authorization: Bearer <token>
      const res = await apiFetch("/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message ?? `Lỗi máy chủ (${res.status})`);
      }
      const data = await res.json();
      if (typeof window !== "undefined" && data?.orderId) {
        sessionStorage.setItem("brewlite_active_pending_order", String(data.orderId));
        try {
          const itemMeta = displayItems.map((item) => ({
            productId: item.id,
            productName: item.name,
            size: item.size || "M",
            temp: item.temp,
            temperature: item.temperature,
            iceLevel: item.iceLevel,
            sugarLevel: item.sugarLevel,
            servingStyle: item.servingStyle,
            isBakery: item.isBakery,
            toppings: item.toppings,
            notes: item.notes,
          }));
          localStorage.setItem(
            `order_customizations_${data.orderId}`,
            JSON.stringify(itemMeta)
          );
        } catch {
          // ignore storage error
        }
      }
      // Giữ nguyên giỏ hàng cho đến khi thanh toán thành công ở màn hình Checkout
      router.push(`/checkout?orderId=${data.orderId}`);
    } catch (e: unknown) {
      setCheckoutError(e instanceof Error ? e.message : "Đặt hàng thất bại, vui lòng thử lại.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  /**
   * 4. Handle updating item from ProductDetailModal
   */
  const handleUpdateItem = (
    _product: Product,
    customization: CustomizationDetails
  ) => {
    if (!editingItem) return;
    const key = getKey(editingItem);
    const isBakery = customization.isBakery || isBakeryProduct(editingItem);
    const isHot = customization.temp === "hot";
    updateCartItem(key, {
      size: isBakery ? undefined : customization.size,
      temp: customization.temp,
      temperature: isHot ? "HOT" : "COLD",
      servingStyle: customization.servingStyle,
      isBakery,
      iceLevel: isBakery || isHot ? undefined : customization.ice,
      sugarLevel: isBakery ? undefined : customization.sweetness,
      toppings: customization.toppings.map((t) => t.name),
      notes: customization.notes,
      quantity: customization.quantity,
      price: customization.unitPrice,
    });
    setEditingItem(null);
  };

  const handleSuggestedAdd = (s: (typeof SUGGESTED)[0]) => {
    addItem({
      id: s.id,
      name: s.name,
      price: s.price,
      temp: "iced",
      temperature: "COLD",
      servingStyle: "Dùng ngay",
      isBakery: true,
      quantity: 1,
      imageUrl: s.img,
    });
  };

  return (
    <div className="min-h-screen bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body selection:bg-[#fedcc2] selection:text-[#2c1810]">
      {/* Site Header */}
      <Header cartCount={count} activeTab="menu" />

      {/* ── Main Content Area ── */}
      <main className="flex-1 w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-8">
        {/* Navigation header row */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
          <div>
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-[#2c1810] font-semibold font-body transition-colors mb-1.5"
            >
              <ArrowLeft size={14} strokeWidth={2.5} />
              {"Quay lại Thực đơn".normalize("NFC")}
            </Link>
            <div className="flex items-center gap-2.5">
              <h1 className="font-headline text-[28px] md:text-[32px] font-bold text-[#1d1b19] leading-tight">
                {"Giỏ hàng".normalize("NFC")}
              </h1>
              {count > 0 && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[13px] font-bold font-body bg-[#f8d5b8] text-[#7c3d12]">
                  {count} {"món".normalize("NFC")}
                </span>
              )}
            </div>
          </div>

          {/* Clear all action */}
          {displayItems.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="flex items-center gap-1.5 text-[12px] text-stone-500 hover:text-red-600 font-semibold font-body transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
              >
                <Trash2 size={14} strokeWidth={2} />
                {"Xóa tất cả".normalize("NFC")}
              </button>
            </div>
          )}
        </div>

        {/* ── Main Grid or Empty State ── */}
        {!hydrated ? (
          /* Skeleton Loader */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 flex flex-col gap-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex gap-4 p-4 bg-white rounded-2xl border border-stone-100 animate-pulse"
                >
                  <div className="w-[88px] h-[88px] rounded-xl bg-stone-100 shrink-0" />
                  <div className="flex-1 flex flex-col gap-2 pt-1">
                    <div className="h-4 bg-stone-100 rounded w-1/2" />
                    <div className="h-3 bg-stone-100 rounded w-1/3" />
                    <div className="h-6 bg-stone-100 rounded-full w-24 mt-1" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl border border-stone-100 p-5 h-32 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : displayItems.length === 0 ? (
          /* 2. Empty state: font-sans, single centered button */
          <EmptyCart />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* ── LEFT: Items + Suggested (3. 100% Cashless banner removed) ── */}
            <section className="lg:col-span-2 flex flex-col gap-3">
              {/* Pickup notification pill */}
              <div className="flex items-center gap-3 px-4 py-2.5 bg-[#f3ede9] rounded-xl border border-stone-200/50">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#febc85] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#845326]" />
                </span>
                <p className="text-[12px] text-stone-600 font-body">
                  <span className="font-bold text-[#1d1b19]">Downtown Roastery</span>
                  {" · "}
                  <span className="text-[#845326] font-semibold">
                    {"Nhận tại quầy · ~5 phút sau đặt hàng".normalize("NFC")}
                  </span>
                </p>
              </div>

              {/* Cart Items list */}
              <div className="flex flex-col gap-3">
                {displayItems.map((item) => {
                  const key = getKey(item);
                  return (
                    <CartItemCard
                      key={key}
                      item={item}
                      onUpdateQty={(qty) => updateQuantity(key, qty)}
                      onRequestDelete={(it) => setItemToDelete(it)}
                      onEdit={(it) => setEditingItem(it)}
                    />
                  );
                })}
              </div>

              {/* Add more CTA */}
              <Link
                href="/menu"
                className="flex items-center justify-center gap-2 w-full py-3.5 border-2 border-dashed border-stone-200 rounded-2xl text-[13px] text-stone-400 hover:border-[#845326] hover:text-[#845326] font-semibold font-body transition-colors"
              >
                <Plus size={15} strokeWidth={2.5} />
                {"Thêm món khác".normalize("NFC")}
              </Link>

              {/* Suggested items */}
              <SuggestedItems onAdd={handleSuggestedAdd} />
            </section>

            {/* ── RIGHT: 3 separate sidebar cards ── */}
            <aside className="flex flex-col gap-4 lg:sticky lg:top-24">
              <LocationCard />
              <PromoCard
                appliedCode={appliedPromo}
                appliedPercent={Math.round(discountRate * 100)}
                vouchers={availableVouchers}
                matchedVoucher={matchedVoucher}
                subtotal={subtotal}
                discountAmount={discountAmount}
                onApply={(code) => setAppliedPromo(code)}
                onRemove={() => setAppliedPromo(null)}
                onOpenModal={() => setIsVoucherModalOpen(true)}
              />
              <SummaryCard
                subtotal={subtotal}
                itemCount={count}
                discount={discountAmount}
                promoCode={appliedPromo}
                matchedVoucher={matchedVoucher}
                onCheckout={handleCheckout}
                isLoading={checkoutLoading}
                error={checkoutError}
              />
            </aside>
          </div>
        )}
      </main>

      {/* ── 4. Edit item popup modal using ProductDetailModal ── */}
      {editingItem && (
        <ProductDetailModal
          product={editingProduct}
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          onAddToCart={handleUpdateItem}
          actionLabel={"Cập nhật món".normalize("NFC")}
          initialCustomization={{
            size: (editingItem.size as "S" | "M" | "L") || "M",
            temp:
              editingItem.temperature === "HOT" ||
              editingItem.temp?.toLowerCase() === "hot" ||
              editingItem.servingStyle === "Hâm nóng" ||
              editingItem.servingStyle === "Hâm nóng giòn"
                ? "hot"
                : "iced",
            servingStyle: editingItem.servingStyle,
            isBakery: editingItem.isBakery || isBakeryProduct(editingItem),
            sweetness: editingItem.sugarLevel || "100%",
            ice: editingItem.iceLevel || "Đá thường (100%)",
            toppings: editingItem.toppings || [],
            notes: editingItem.notes || "",
            quantity: editingItem.quantity || 1,
          }}
        />
      )}

      {/* ── Confirmation Dialog for deleting single item ── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 size={20} strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-headline font-bold text-[15px] text-stone-900">
                  {"Xác nhận xóa món".normalize("NFC")}
                </h4>
                <p className="text-[11px] text-stone-400">
                  {"Thao tác này sẽ bỏ món khỏi giỏ hàng".normalize("NFC")}
                </p>
              </div>
            </div>

            <p className="text-[13px] text-stone-700 leading-relaxed font-body">
              {"Bạn có chắc chắn muốn xóa món ".normalize("NFC")}
              <strong className="text-stone-900 font-bold">{itemToDelete.name}</strong>
              {" khỏi giỏ hàng không?".normalize("NFC")}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 text-[13px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors font-body"
              >
                {"Hủy".normalize("NFC")}
              </button>
              <button
                type="button"
                onClick={() => {
                  removeItem(getKey(itemToDelete));
                  setItemToDelete(null);
                }}
                className="px-4 py-2 text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs font-body active:scale-95"
              >
                {"Xác nhận xóa".normalize("NFC")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog for clear all items */}
      {confirmClearAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-stone-100 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600 shrink-0">
                <Trash2 size={20} strokeWidth={2} />
              </div>
              <div>
                <h4 className="font-headline font-bold text-[15px] text-stone-900">
                  {"Xóa toàn bộ giỏ hàng".normalize("NFC")}
                </h4>
                <p className="text-[11px] text-stone-400">
                  {"Tất cả các món sẽ bị xóa".normalize("NFC")}
                </p>
              </div>
            </div>

            <p className="text-[13px] text-stone-700 leading-relaxed font-body">
              {"Bạn có chắc chắn muốn xóa toàn bộ các món trong giỏ hàng không?".normalize(
                "NFC"
              )}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="px-4 py-2 text-[13px] font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors font-body"
              >
                {"Hủy".normalize("NFC")}
              </button>
              <button
                type="button"
                onClick={() => {
                  clearCart();
                  setConfirmClearAll(false);
                }}
                className="px-4 py-2 text-[13px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-xs font-body active:scale-95"
              >
                {"Xóa tất cả".normalize("NFC")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile sticky checkout bar */}
      {hydrated && displayItems.length > 0 && (
        <div className="lg:hidden sticky bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur-md px-4 py-3">
          <button
            type="button"
            onClick={handleCheckout}
            className="w-full flex items-center justify-between bg-[#221811] hover:bg-[#2c1810] text-white px-5 py-3.5 rounded-xl transition-colors font-body shadow-md active:scale-98"
            id="mobileCheckoutBtn"
          >
            <span className="text-[14px] font-bold">
              {"Thanh toán".normalize("NFC")}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[14px] font-bold">
                {vnd(
                  Math.floor(
                    (Math.max(0, subtotal - discountAmount) +
                      Math.floor(Math.max(0, subtotal - discountAmount) * 0.08)) /
                      1000
                  ) * 1000
                )}
              </span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      )}

      {/* ── Voucher Modal (Xem tất cả & Đổi Hạt Vàng) ── */}
      <VoucherModal
        isOpen={isVoucherModalOpen}
        onClose={() => setIsVoucherModalOpen(false)}
        vouchers={availableVouchers}
        appliedCode={appliedPromo}
        subtotal={subtotal}
        onSelectVoucher={(code) => setAppliedPromo(code)}
        onRemoveVoucher={() => setAppliedPromo(null)}
        onRedeemSuccess={handleRedeemSuccess}
      />

      {/* Footer */}
      <Footer />
    </div>
  );
}

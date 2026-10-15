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
} from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import ProductDetailModal, { CustomizationDetails } from "../components/ProductDetailModal";
import { DEFAULT_PRODUCTS, Product } from "../menu/page";
import { useCartStore, CartItem } from "../store/cartStore";
import { useAuthStore, apiFetch } from "../store/authStore";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function vnd(n: number) {
  return n.toLocaleString("vi-VN") + "đ";
}

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1485808191679-5f86510681a2?auto=format&fit=crop&w=400&q=85";

/** Suggested add-on items */
const SUGGESTED = [
  {
    id: 7,
    name: "Pain au Chocolat",
    desc: "Bánh bơ xốp phủ socola Bỉ".normalize("NFC"),
    price: 45000,
    img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=85",
  },
  {
    id: 8,
    name: "Honey Cruffin",
    desc: "Croissant-muffin quế mật ong".normalize("NFC"),
    price: 49000,
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=85",
  },
  {
    id: 5,
    name: "Uji Matcha",
    desc: "Matcha Kyoto đánh bọt mịn".normalize("NFC"),
    price: 62000,
    img: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?auto=format&fit=crop&w=400&q=85",
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
  const isIced = item.temp === "iced" || item.temp?.toLowerCase() === "iced";
  const totalLinePrice = item.price * item.quantity;

  const subtitle =
    item.name.toLowerCase().includes("muối")
      ? "Phin nhôm truyền thống pha chậm × Sữa đặc nguyên kem".normalize("NFC")
      : item.name.toLowerCase().includes("sữa đá") || item.name.toLowerCase().includes("sua da")
        ? "Robusta Đắk Lắk đậm đặc × Sữa đặc kem béo".normalize("NFC")
        : item.name.toLowerCase().includes("matcha")
          ? "Matcha Uji đánh bọt × Sữa yến mạch Minor Figures".normalize("NFC")
          : item.name.toLowerCase().includes("macchiato")
            ? "Double espresso × Sữa nguyên kem × Caramel nghệ nhân".normalize("NFC")
            : item.name.toLowerCase().includes("flat white")
              ? "Double ristretto × Yến mạch Minor Figures × Vanilla Madagascar".normalize("NFC")
              : item.name.toLowerCase().includes("cold brew")
                ? "Ngâm lạnh 20 giờ × Nước tonic citrus × Hương hoa thảo mộc".normalize("NFC")
                : item.name.toLowerCase().includes("chocolat") || item.name.toLowerCase().includes("cruffin")
                  ? "Bơ Châu Âu xốp tầng tầng × Nướng mới mỗi giờ".normalize("NFC")
                  : null;

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
            {subtitle && (
              <p className="text-[11px] text-stone-400 mt-0.5 line-clamp-1 font-body italic">
                {subtitle}
              </p>
            )}
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

        {/* Row 2: Attribute & topping badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Size */}
          {item.size && (
            <AttributeBadge>Size {item.size}</AttributeBadge>
          )}

          {/* Ice / Hot (Icons are synchronized text-stone-900, not blue or red) */}
          {isIced ? (
            <AttributeBadge>
              <Snowflake size={12} className="text-stone-900" strokeWidth={2.2} />
              <span>{item.temp === "iced" ? "Đá thường" : item.temp}</span>
            </AttributeBadge>
          ) : (
            <AttributeBadge>
              <Flame size={12} className="text-stone-900" strokeWidth={2.2} />
              <span>{"Uống Nóng".normalize("NFC")}</span>
            </AttributeBadge>
          )}

          {/* Paid toppings: Warm honey/caramel highlighted badge */}
          {item.toppings &&
            item.toppings.length > 0 &&
            item.toppings.map((t) => (
              <ToppingBadge key={t}>
                <span className="text-[11px] font-bold">+</span>
                <span>{t}</span>
              </ToppingBadge>
            ))}
        </div>

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
function PromoCard({
  appliedCode,
  onApply,
  onRemove,
}: {
  appliedCode: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
}) {
  const [inputCode, setInputCode] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputCode.trim()) return;
    onApply(inputCode.trim().toUpperCase());
    setInputCode("");
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-xs p-5 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-[#f4efe6] flex items-center justify-center">
          <Tag size={15} className="text-[#845326]" strokeWidth={1.75} />
        </div>
        <span className="font-headline text-[14px] font-bold text-[#1d1b19]">
          {"Mã giảm giá ưu đãi".normalize("NFC")}
        </span>
      </div>

      {!appliedCode ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value.toUpperCase())}
            placeholder={"VD: BREWCOZY".normalize("NFC")}
            id="promoCodeInput"
            className="flex-1 px-3.5 py-2.5 text-[13px] bg-[#f8f2ee] border border-stone-200 rounded-xl focus:outline-hidden focus:border-[#845326] focus:bg-white text-[#1d1b19] placeholder:text-stone-400 font-body transition-colors uppercase"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-[#221811] hover:bg-[#2c1810] text-white text-[13px] font-bold rounded-xl transition-colors font-body whitespace-nowrap active:scale-95"
          >
            {"Áp dụng".normalize("NFC")}
          </button>
        </form>
      ) : (
        <div className="flex items-center justify-between gap-2 bg-[#fff7ed] border border-[#fed7aa] rounded-xl px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" strokeWidth={2} />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#2c1810] font-body">
                {`Mã ${appliedCode} (-15% Giờ vàng)`}
              </p>
              <p className="text-[11px] text-stone-500 font-body">
                {"Đã áp dụng giảm 15% vào đơn hàng".normalize("NFC")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onRemove}
            aria-label={"Gỡ mã".normalize("NFC")}
            className="shrink-0 p-1 rounded-full hover:bg-[#fed7aa] text-stone-500 hover:text-[#b45309] transition-colors"
          >
            <X size={15} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {!appliedCode && (
        <p className="text-[11px] text-stone-400 font-body">
          {"Thử mã ".normalize("NFC")}
          <button
            type="button"
            onClick={() => onApply("BREWCOZY")}
            className="font-mono font-bold text-[#845326] bg-[#fff2e5] hover:bg-[#fde7d4] px-1.5 py-0.5 rounded transition"
          >
            BREWCOZY
          </button>
          {" để nhận ưu đãi -15% giờ vàng hôm nay!".normalize("NFC")}
        </p>
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
  onCheckout,
  isLoading,
  error,
}: {
  subtotal: number;
  itemCount: number;
  discount: number;
  promoCode: string | null;
  onCheckout: () => void;
  isLoading?: boolean;
  error?: string | null;
}) {
  const ECO_FEE = 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const vat = Math.round(afterDiscount * 0.08);
  const total = afterDiscount + vat + ECO_FEE;
  const loyaltyPoints = Math.floor(total / 1000);

  return (
    <div className="bg-white rounded-2xl border border-stone-100 shadow-xs p-5 flex flex-col gap-4">
      <span className="font-headline text-[14px] font-bold text-[#1d1b19]">
        {"Tóm tắt thanh toán".normalize("NFC")}
      </span>

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
          <span className="text-stone-800">{vnd(vat)}</span>
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
          <p className="text-[11px] text-stone-400 font-body uppercase tracking-wider font-bold">
            {"Tổng cộng".normalize("NFC")}
          </p>
          <p className="text-[11px] text-stone-400 font-body">
            {"Đã bao gồm VAT".normalize("NFC")}
          </p>
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
  } = useCartStore();

  const [hydrated, setHydrated] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
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
  }, []);

  const count = hydrated ? cartCount() : 0;
  const subtotal = hydrated ? cartTotal() : 0;
  const displayItems = hydrated ? items : [];

  // Calculate discount based on promo code
  const discountRate = appliedPromo === "BREWCOZY" ? 0.15 : 0;
  const discountAmount = Math.round(subtotal * discountRate);

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
      };
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
      clearCart();
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
    updateCartItem(key, {
      size: customization.size,
      temp: customization.temp,
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
      temp: "hot",
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
                onApply={(code) => setAppliedPromo(code)}
                onRemove={() => setAppliedPromo(null)}
              />
              <SummaryCard
                subtotal={subtotal}
                itemCount={count}
                discount={discountAmount}
                promoCode={appliedPromo}
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
            temp: (editingItem.temp as "iced" | "hot") || "iced",
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
                {vnd(subtotal - discountAmount + Math.round((subtotal - discountAmount) * 0.08))}
              </span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </div>
          </button>
        </div>
      )}

      {/* Footer */}
      <Footer />
    </div>
  );
}

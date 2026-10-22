"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Product, normalizeStitchImageUrl } from "../utils/productUtils";
import { isBakeryProduct } from "../store/cartStore";

export interface ToppingItem {
  id: string;
  name: string;
  subtext: string;
  price: number;
}

export interface CustomizationDetails {
  size: "S" | "M" | "L";
  sizeExtra: number;
  sizeLabel: string;
  temp: "iced" | "hot";
  tempLabel: string;
  sweetness: string;
  ice: string;
  toppings: ToppingItem[];
  notes: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  isBakery?: boolean;
  servingStyle?: string;
}

export interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (product: Product, customization: CustomizationDetails) => void;
  /**
   * If true, renders as modal overlay.
   * If false, renders as full standalone page layout.
   */
  isModal?: boolean;
  initialCustomization?: {
    size?: "S" | "M" | "L";
    temp?: "iced" | "hot";
    sweetness?: string;
    ice?: string;
    toppings?: string[];
    notes?: string;
    quantity?: number;
    servingStyle?: string;
    isBakery?: boolean;
  };
  actionLabel?: string;
}

const AVAILABLE_TOPPINGS: ToppingItem[] = [
  {
    id: "boba",
    name: "Trân châu trắng giòn".normalize("NFC"),
    subtext: "Crystal boba dẻo dai".normalize("NFC"),
    price: 8000,
  },
  {
    id: "cream",
    name: "Thêm Kem Muối Béo".normalize("NFC"),
    subtext: "Velvety Salted Foam".normalize("NFC"),
    price: 10000,
  },
  {
    id: "jelly",
    name: "Thạch Cà Phê Phin".normalize("NFC"),
    subtext: "Đậm vị Robusta giòn sần sật".normalize("NFC"),
    price: 8000,
  },
  {
    id: "shot",
    name: "Thêm 1 Shot Espresso".normalize("NFC"),
    subtext: "Tăng cường tỉnh táo đậm sâu".normalize("NFC"),
    price: 12000,
  },
];

export const AVAILABLE_BAKERY_TOPPINGS: ToppingItem[] = [
  {
    id: "bakery_butter",
    name: "Bơ lạt Anchor".normalize("NFC"),
    subtext: "Bơ New Zealand thơm béo ngậy".normalize("NFC"),
    price: 5000,
  },
  {
    id: "bakery_cream_cheese",
    name: "Phô mai kem".normalize("NFC"),
    subtext: "Phô mai tươi chua nhẹ, ngậy béo".normalize("NFC"),
    price: 10000,
  },
  {
    id: "bakery_jam",
    name: "Mứt dâu tây".normalize("NFC"),
    subtext: "Dâu tây Đà Lạt nguyên quả chua ngọt".normalize("NFC"),
    price: 8000,
  },
  {
    id: "bakery_choco",
    name: "Xốt sô-cô-la ấm".normalize("NFC"),
    subtext: "Socola Bỉ đun chảy đậm đà".normalize("NFC"),
    price: 10000,
  },
];

const BAKERY_NOTE_CHIPS = [
  "+ Hâm thật nóng",
  "+ Cắt đôi bánh",
  "+ Thêm túi mang đi",
  "+ Thêm sốt trực tiếp vào bánh",
];

const DRINK_NOTE_CHIPS = [
  "+ Ít sữa đặc",
  "+ Đá riêng ly nhựa",
  "+ Cắt đôi bánh",
  "+ Thêm túi mang đi",
];

export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  isModal = true,
  initialCustomization,
  actionLabel,
}: ProductDetailModalProps) {
  // State for customization options
  const isBakery = useMemo(() => isBakeryProduct(product), [product]);
  const [availableToppings, setAvailableToppings] = useState<ToppingItem[]>(AVAILABLE_TOPPINGS);
  const [availableBakeryToppings, setAvailableBakeryToppings] = useState<ToppingItem[]>(AVAILABLE_BAKERY_TOPPINGS);
  const currentAvailableToppings = useMemo(() => {
    return isBakery ? availableBakeryToppings : availableToppings;
  }, [isBakery, availableBakeryToppings, availableToppings]);

  const [selectedSize, setSelectedSize] = useState<"S" | "M" | "L">("M");
  const [temperature, setTemperature] = useState<"iced" | "hot">("iced");
  const [sweetness, setSweetness] = useState<string>("100%");
  const [iceLevel, setIceLevel] = useState<string>("Đá thường (100%)");
  const [selectedToppingIds, setSelectedToppingIds] = useState<string[]>([]);
  const [baristaNotes, setBaristaNotes] = useState<string>("");
  const [quantity, setQuantity] = useState<number>(1);
  const [isFavorite, setIsFavorite] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [globalSizePricing, setGlobalSizePricing] = useState<{ sizeS: number; sizeM: number; sizeL: number }>({
    sizeS: 0,
    sizeM: 5000,
    sizeL: 10000,
  });

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    fetch(`${apiBase}/inventory/pricing-config`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.sizePricing) {
          setGlobalSizePricing({
            sizeS: Number(data.sizePricing.sizeS ?? 0),
            sizeM: Number(data.sizePricing.sizeM ?? 5000),
            sizeL: Number(data.sizePricing.sizeL ?? 10000),
          });
        }
        if (Array.isArray(data.toppings) && data.toppings.length > 0) {
          const allLoadedToppings = data.toppings.map((t: { id: string; name?: string; toppingName?: string; subtext?: string; price: number }) => ({
            id: t.id,
            name: (t.name || t.toppingName || "").normalize("NFC"),
            subtext: (t.subtext || "Topping đặc biệt").normalize("NFC"),
            price: Number(t.price ?? 8000),
          }));
          const drinks = allLoadedToppings.filter((t: ToppingItem) => !t.id.startsWith("bakery_"));
          const bakery = allLoadedToppings.filter((t: ToppingItem) => t.id.startsWith("bakery_"));
          if (drinks.length > 0) setAvailableToppings(drinks);
          if (bakery.length > 0) setAvailableBakeryToppings(bakery);
        }
      })
      .catch(() => {
        // Fallback to static defaults when backend is offline
      });
  }, [isOpen]);

  // Initialize or reset defaults when a new product or initialCustomization is provided
  useEffect(() => {
    if (product) {
      if (initialCustomization) {
        setSelectedSize(initialCustomization.size || "M");
        setTemperature(initialCustomization.temp || "iced");
        setSweetness(initialCustomization.sweetness || "100%");
        setIceLevel(initialCustomization.ice || "Đá thường (100%)");
        const matchingToppings = currentAvailableToppings.filter((t) =>
          initialCustomization.toppings?.some(
            (top) =>
              top.toLowerCase().includes(t.name.toLowerCase()) ||
              t.name.toLowerCase().includes(top.toLowerCase()) ||
              top === t.id
          )
        ).map((t) => t.id);
        setSelectedToppingIds(matchingToppings);
        setBaristaNotes(initialCustomization.notes || "");
        setQuantity(initialCustomization.quantity || 1);
        setShowToast(false);
      } else {
        setSelectedSize("M");
        if (isBakery) {
          const n = (product.name || "").toLowerCase();
          if (
            n.includes("cheesecake") ||
            n.includes("tiramisu") ||
            n.includes("mousse")
          ) {
            setTemperature("iced"); // Dùng lạnh / Dùng ngay
          } else {
            setTemperature("hot"); // Hâm nóng giòn
          }
        } else if (
          product.chips?.temps &&
          product.chips.temps.length === 1 &&
          product.chips.temps[0].toLowerCase().includes("hot")
        ) {
          setTemperature("hot");
        } else {
          setTemperature("iced");
        }
        setSweetness("100%");
        setIceLevel("Đá thường (100%)");
        setSelectedToppingIds([]);
        setBaristaNotes("");
        setQuantity(1);
        setShowToast(false);
      }
    }
  }, [product, initialCustomization, isOpen, isBakery, currentAvailableToppings]);

  // Close modal on Escape key
  useEffect(() => {
    if (!isOpen || !isModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isModal, onClose]);

  // Size definition and price extras
  interface SizeItemConfig {
    code: "S" | "M" | "L";
    label: string;
    extra: number;
    badgeText: string;
    icon: string;
    popular?: boolean;
  }

  const sizeConfig: Record<"S" | "M" | "L", SizeItemConfig> = useMemo(() => {
    const extraS = globalSizePricing.sizeS;
    const extraM =
      product?.sizeUpchargeM !== null && product?.sizeUpchargeM !== undefined
        ? Number(product.sizeUpchargeM)
        : globalSizePricing.sizeM;
    const extraL =
      product?.sizeUpchargeL !== null && product?.sizeUpchargeL !== undefined
        ? Number(product.sizeUpchargeL)
        : globalSizePricing.sizeL;
    return {
      S: {
        code: "S",
        label: "Nhỏ - 250ml".normalize("NFC"),
        extra: extraS,
        badgeText: "S",
        icon: "local_cafe",
        popular: false,
      },
      M: {
        code: "M",
        label: "Vừa - 350ml".normalize("NFC"),
        extra: extraM,
        badgeText: "M",
        popular: true,
        icon: "local_cafe",
      },
      L: {
        code: "L",
        label: "Lớn - 500ml".normalize("NFC"),
        extra: extraL,
        badgeText: "L",
        icon: "emoji_food_beverage",
        popular: false,
      },
    };
  }, [product, globalSizePricing]);

  const sizeExtraPrice = isBakery ? 0 : sizeConfig[selectedSize].extra;

  // Selected toppings list and total extra price
  const selectedToppingsList = useMemo(() => {
    return currentAvailableToppings.filter((t) => selectedToppingIds.includes(t.id));
  }, [currentAvailableToppings, selectedToppingIds]);

  const toppingsExtraPrice = useMemo(() => {
    return selectedToppingsList.reduce((sum, item) => sum + item.price, 0);
  }, [selectedToppingsList]);

  // Dynamic unit price: (Base price + Size extra + Selected Toppings)
  const unitPrice = useMemo(() => {
    if (!product) return 0;
    return product.basePrice + sizeExtraPrice + toppingsExtraPrice;
  }, [product, sizeExtraPrice, toppingsExtraPrice]);

  // Total price = Unit Price * Quantity
  const totalPrice = useMemo(() => {
    return unitPrice * quantity;
  }, [unitPrice, quantity]);

  // Toggle Topping
  const handleToggleTopping = (toppingId: string) => {
    setSelectedToppingIds((prev) =>
      prev.includes(toppingId)
        ? prev.filter((id) => id !== toppingId)
        : [...prev, toppingId]
    );
  };

  // Quick Barista notes append
  const handleInsertNote = (text: string) => {
    if (!baristaNotes.trim()) {
      setBaristaNotes(text);
    } else if (!baristaNotes.includes(text)) {
      setBaristaNotes(`${baristaNotes}, ${text}`);
    }
  };

  // Quantity Change
  const handleQtyChange = (delta: number) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  // Add to Cart
  const handleAddToCartClick = () => {
    if (!product) return;

    const customization: CustomizationDetails = {
      size: isBakery ? "M" : selectedSize,
      sizeExtra: isBakery ? 0 : sizeExtraPrice,
      sizeLabel: isBakery ? "1 Phần" : sizeConfig[selectedSize].label,
      temp: temperature,
      tempLabel: isBakery
        ? (temperature === "hot" ? "Hâm nóng" : "Dùng ngay")
        : (temperature === "iced" ? "Đá" : "Nóng"),
      sweetness: isBakery ? "" : sweetness,
      ice: isBakery ? "" : iceLevel,
      toppings: selectedToppingsList,
      notes: baristaNotes.trim(),
      quantity,
      unitPrice,
      totalPrice,
      isBakery,
      servingStyle: isBakery
        ? (temperature === "hot" ? "Hâm nóng" : "Dùng ngay")
        : undefined,
    };

    if (onAddToCart) {
      onAddToCart(product, customization);
    }

    // Trigger toast notification
    const summary = isBakery
      ? `${quantity}x ${product.name} (${temperature === "hot" ? "Hâm nóng" : "Dùng ngay"
      }) • ${totalPrice.toLocaleString("vi-VN")}đ`
      : `${quantity}x ${product.name} (Size ${selectedSize}, ${temperature === "iced" ? "Đá" : "Nóng"
      }) • ${totalPrice.toLocaleString("vi-VN")}đ`;
    setToastMessage(summary);
    setShowToast(true);

    // Auto dismiss toast after 1.8s and close modal if in modal mode
    setTimeout(() => {
      setShowToast(false);
      if (isModal) {
        onClose();
      }
    }, 1800);
  };

  if (!isOpen && isModal) return null;
  if (!product) return null;

  const content = (
    <div className="relative w-full bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body">
      {/* Toast Notification Container */}
      <div
        className={`fixed top-6 right-6 z-50 transform transition-all duration-300 pointer-events-none flex items-center gap-3 bg-[#2c1810] text-[#fef8f4] px-5 py-3 rounded-2xl shadow-2xl border border-[#febc85]/30 ${showToast
          ? "translate-y-0 opacity-100 scale-100"
          : "-translate-y-8 opacity-0 scale-95 pointer-events-none"
          }`}
        id="toast-notification"
      >
        <span
          className="material-symbols-outlined text-[#febc85] text-2xl"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          check_circle
        </span>
        <div className="flex flex-col">
          <span className="font-headline text-[14px] text-white font-bold">
            {"Đã thêm vào giỏ hàng!".normalize("NFC")}
          </span>
          <span className="text-[12px] text-[#e3bfb2] font-body mt-0.5">
            {toastMessage || product.name}
          </span>
        </div>
      </div>

      {/* Top Header / Breadcrumbs Bar inside modal or standalone page */}
      {isModal ? (
        <div className="sticky top-0 z-30 bg-[#fef8f4]/95 backdrop-blur-md border-b border-[#2c1810]/10 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#504440] hover:text-[#2c1810] transition-colors group cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>{"Quay lại Thực đơn".normalize("NFC")}</span>
          </button>

          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3ede9] text-[12px] font-semibold text-[#504440] border border-[#2c1810]/5">
              <span className="w-2 h-2 rounded-full bg-[#845326] animate-pulse" />
              {"Đang phục vụ tại Quầy Express".normalize("NFC")}
            </span>

            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isFavorite
                ? "bg-[#fedcc2] text-[#845326]"
                : "bg-[#f3ede9] hover:bg-[#ede7e3] text-[#504440]"
                }`}
              title="Lưu món yêu thích"
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#f3ede9] hover:bg-[#ede7e3] flex items-center justify-center text-[#504440] hover:text-[#1d1b19] transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-2 flex items-center justify-between gap-4">
          <Link
            href="/menu"
            className="inline-flex items-center gap-2 text-[14px] font-semibold text-[#504440] hover:text-[#2c1810] transition-colors group"
          >
            <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
              arrow_back
            </span>
            <span>{"Quay lại Thực đơn".normalize("NFC")}</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-3">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3ede9] text-[12px] font-semibold text-[#504440] border border-[#2c1810]/5">
              <span className="w-2 h-2 rounded-full bg-[#845326] animate-pulse" />
              {"Đang phục vụ tại Quầy Express".normalize("NFC")}
            </span>

            <button
              type="button"
              onClick={() => setIsFavorite(!isFavorite)}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors cursor-pointer ${isFavorite
                ? "bg-[#fedcc2] text-[#845326]"
                : "bg-[#f3ede9] hover:bg-[#ede7e3] text-[#504440]"
                }`}
              title="Lưu món yêu thích"
            >
              <span
                className="material-symbols-outlined text-lg"
                style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}
              >
                favorite
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Main Detail Grid Layout (12 Cols: 5 Cols Left, 7 Cols Right) */}
      <div className="max-w-[1280px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ── LEFT COLUMN: Product Visuals & Heritage Showcase (5 Cols Desktop) ── */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            {/* Main Product Image Card */}
            <div className="relative w-full aspect-square rounded-3xl overflow-hidden bg-[#f8f2ee] shadow-md group border border-[#2c1810]/5">
              <Image
                src={normalizeStitchImageUrl(product.imageUrl, 1200, 85)}
                alt={product.name}
                fill
                unoptimized
                sizes="(max-width: 1024px) 100vw, 42vw"
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />

              {/* Badges Overlays */}
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
                <span className="px-3.5 py-1 rounded-full bg-white/90 backdrop-blur-md text-[12px] text-[#845326] font-bold shadow-sm inline-flex items-center gap-1.5 font-body">
                  <span className="material-symbols-outlined text-sm">
                    workspace_premium
                  </span>
                  {product.tag || "Barista Signature"}
                </span>

                <span className="px-3.5 py-1 rounded-full bg-[#2c1810]/85 backdrop-blur-md text-[12px] text-white shadow-sm inline-flex items-center gap-1.5 font-body">
                  <span className="material-symbols-outlined text-sm">
                    schedule
                  </span>
                  {"Chuẩn bị ~3 phút".normalize("NFC")}
                </span>
              </div>

              {/* Roast Meter Overlay on Bottom of Image */}
              <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md shadow-md border border-[#2c1810]/5">
                <div className="flex items-center justify-between mb-1.5 text-[12px]">
                  <span className="text-[#504440] font-medium font-body">
                    {"Mức độ rang (Roast Level)".normalize("NFC")}
                  </span>
                  <span className="font-bold text-[#1d1b19] font-body">
                    {"Medium-Dark (Vừa - Đậm)".normalize("NFC")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 w-full">
                  <div className="h-1.5 flex-1 rounded-full bg-[#845326]" />
                  <div className="h-1.5 flex-1 rounded-full bg-[#845326]" />
                  <div className="h-1.5 flex-1 rounded-full bg-[#845326]" />
                  <div className="h-1.5 flex-1 rounded-full bg-[#845326]" />
                  <div className="h-1.5 flex-1 rounded-full bg-[#ede7e3]" />
                </div>
              </div>
            </div>

            {/* Sensory & Origin Badges (3 cols) */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-[#f8f2ee] flex flex-col items-center text-center border border-[#2c1810]/5">
                <span className="material-symbols-outlined text-[#845326] text-xl mb-1">
                  local_fire_department
                </span>
                <span className="text-[13px] text-[#1d1b19] font-bold font-body">
                  145 kcal
                </span>
                <span className="text-[10px] text-[#827470] font-body mt-0.5">
                  {"Khẩu phần vừa".normalize("NFC")}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8f2ee] flex flex-col items-center text-center border border-[#2c1810]/5">
                <span className="material-symbols-outlined text-[#845326] text-xl mb-1">
                  bolt
                </span>
                <span className="text-[13px] text-[#1d1b19] font-bold font-body">
                  95 mg
                </span>
                <span className="text-[10px] text-[#827470] font-body mt-0.5">
                  {"Caffeine tự nhiên".normalize("NFC")}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#f8f2ee] flex flex-col items-center text-center border border-[#2c1810]/5">
                <span className="material-symbols-outlined text-[#845326] text-xl mb-1">
                  eco
                </span>
                <span className="text-[13px] text-[#1d1b19] font-bold font-body">
                  {"Cầu Đất".normalize("NFC")}
                </span>
                <span className="text-[10px] text-[#827470] font-body mt-0.5">
                  Arabica & Robusta
                </span>
              </div>
            </div>

            {/* Barista Note Quote Card */}
            <div className="p-4 rounded-2xl bg-[#f3ede9] flex gap-3 items-start border border-[#2c1810]/5">
              <span className="material-symbols-outlined text-[#845326] text-2xl shrink-0 mt-0.5">
                format_quote
              </span>
              <div className="flex flex-col">
                <span className="text-[13px] font-bold text-[#1d1b19] font-body">
                  {"Lời nhắn từ Head Barista".normalize("NFC")}
                </span>
                <p className="text-[12px] text-[#504440] leading-relaxed mt-1 font-body">
                  {`“${product.description ||
                    "Hương vị đậm đà nguyên bản phối trộn cùng công thức kem béo đặc trưng từ BrewLite, tạo nên trải nghiệm đa tầng vị độc đáo."
                    }”`}
                </p>
              </div>
            </div>
          </div>

          {/* ── RIGHT COLUMN: Drink Header, Customizations, & Controls (7 Cols Desktop) ── */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            {/* Header Info */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center text-[#845326]">
                  {[...Array(5)].map((_, i) => (
                    <span
                      key={i}
                      className="material-symbols-outlined text-sm"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      star
                    </span>
                  ))}
                </div>
                <span className="text-[12px] font-bold text-[#1d1b19] font-body">
                  {product.rating ?? 4.9}
                </span>
                <span className="text-[12px] text-[#827470] font-body">
                  {"(128 đánh giá từ quầy)".normalize("NFC")}
                </span>
                <span className="w-1 h-1 rounded-full bg-[#d3c3be] mx-1" />
                <span className="text-[12px] text-[#845326] font-bold font-body">
                  {product.tag ?? "#1 Bán Chạy Nhất".normalize("NFC")}
                </span>
              </div>

              <h1 className="font-headline text-[24px] md:text-[32px] text-[#1d1b19] font-bold tracking-tight leading-tight">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-2.5 mt-1">
                <span className="font-headline text-[26px] md:text-[30px] text-[#845326] font-bold">
                  {unitPrice.toLocaleString("vi-VN")}đ
                </span>
                <span className="text-[13px] text-[#827470] font-body">
                  {"Giá gốc: ".normalize("NFC")}
                  {product.basePrice.toLocaleString("vi-VN")}đ
                  {sizeExtraPrice > 0 ? ` (+${sizeExtraPrice.toLocaleString("vi-VN")}đ Size ${selectedSize})` : ""}
                </span>
              </div>

              <p className="text-[14px] text-[#504440] leading-relaxed font-body mt-1">
                {product.description}
              </p>
            </div>

            <div className="w-full h-px bg-[#2c1810]/10" />

            {isBakery ? (
              <>
                {/* Bakery Step 1: CÁCH PHỤC VỤ BÁNH */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#2c1810] text-white text-[11px] flex items-center justify-center font-bold font-body">
                        1
                      </span>
                      <span className="font-headline text-[16px] md:text-[18px] font-bold text-[#1d1b19]">
                        {"Cách Phục Vụ Bánh".normalize("NFC")}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#845326] font-bold font-body">
                      {"Bắt buộc".normalize("NFC")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="bakery-serving-group">
                    <button
                      type="button"
                      onClick={() => setTemperature("hot")}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all text-left cursor-pointer ${temperature === "hot"
                        ? "bg-[#2c1810] text-white shadow-md ring-2 ring-[#2c1810]"
                        : "bg-[#f8f2ee] hover:bg-[#f3ede9] text-[#1d1b19] border border-[#2c1810]/10"
                        }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${temperature === "hot"
                          ? "bg-white/20 text-[#febc85]"
                          : "bg-[#ede7e3] text-[#845326]"
                          }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          local_fire_department
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`block text-[14px] font-bold leading-tight ${temperature === "hot" ? "text-white" : "text-[#1d1b19]"
                            }`}
                        >
                          {"Hâm nóng".normalize("NFC")}
                        </span>
                        <span
                          className={`block text-[11px] mt-1 leading-normal ${temperature === "hot" ? "text-stone-300" : "text-[#827470]"
                            }`}
                        >
                          {"Nướng nóng thơm lừng, xốp giòn chuẩn vị.".normalize("NFC")}
                        </span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTemperature("iced")}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all text-left cursor-pointer ${temperature === "iced"
                        ? "bg-[#2c1810] text-white shadow-md ring-2 ring-[#2c1810]"
                        : "bg-[#f8f2ee] hover:bg-[#f3ede9] text-[#1d1b19] border border-[#2c1810]/10"
                        }`}
                    >
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${temperature === "iced"
                          ? "bg-white/20 text-[#febc85]"
                          : "bg-[#ede7e3] text-[#845326]"
                          }`}
                      >
                        <span className="material-symbols-outlined text-xl">
                          ac_unit
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span
                          className={`block text-[14px] font-bold leading-tight ${temperature === "iced" ? "text-white" : "text-[#1d1b19]"
                            }`}
                        >
                          {"Dùng ngay".normalize("NFC")}
                        </span>
                        <span
                          className={`block text-[11px] mt-1 leading-normal ${temperature === "iced" ? "text-stone-300" : "text-[#827470]"
                            }`}
                        >
                          {"Bảo quản trong quầy, giữ độ mềm tự nhiên trong nhiệt độ phòng.".normalize("NFC")}
                        </span>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Bakery Step 2: MÓN ĂN KÈM (PASTRY ADD-ONS) */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#2c1810] text-white text-[11px] flex items-center justify-center font-bold font-body">
                        2
                      </span>
                      <span className="font-headline text-[16px] md:text-[18px] font-bold text-[#1d1b19]">
                        {"Thêm Món Ăn Kèm (Pastry Add-ons)".normalize("NFC")}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#827470] font-body">
                      {"Chọn nhiều món".normalize("NFC")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="bakery-toppings-container">
                    {availableBakeryToppings.map((topping) => {
                      const isChecked = selectedToppingIds.includes(topping.id);

                      return (
                        <div
                          key={topping.id}
                          onClick={() => handleToggleTopping(topping.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer select-none ${isChecked
                            ? "bg-[#febc85]/20 border-2 border-[#845326] shadow-sm"
                            : "bg-[#f8f2ee] hover:bg-[#f3ede9] border border-[#2c1810]/10"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isChecked
                                ? "bg-[#845326] text-white"
                                : "bg-[#ede7e3] text-transparent"
                                }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                check
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-[#1d1b19] font-body">
                                {topping.name}
                              </span>
                              <span className="text-[11px] text-[#827470] font-body">
                                {topping.subtext}
                              </span>
                            </div>
                          </div>

                          <span className="text-[13px] font-bold text-[#845326] font-body">
                            +{topping.price.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Customization Step 1: KÍCH THƯỚC (SIZE) */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#2c1810] text-white text-[11px] flex items-center justify-center font-bold font-body">
                        1
                      </span>
                      <span className="font-headline text-[16px] md:text-[18px] font-bold text-[#1d1b19]">
                        {"Chọn Kích thước".normalize("NFC")}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#845326] font-bold font-body">
                      {"Bắt buộc".normalize("NFC")}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3" id="size-options-group">
                    {(["S", "M", "L"] as const).map((sizeKey) => {
                      const cfg = sizeConfig[sizeKey];
                      const isSelected = selectedSize === sizeKey;

                      return (
                        <button
                          key={sizeKey}
                          type="button"
                          onClick={() => setSelectedSize(sizeKey)}
                          className={`flex flex-col p-3.5 rounded-2xl transition-all text-left relative cursor-pointer ${isSelected
                            ? "bg-[#2c1810] text-white shadow-md ring-2 ring-[#2c1810]"
                            : "bg-[#f8f2ee] hover:bg-[#f3ede9] text-[#1d1b19] border border-[#2c1810]/10"
                            }`}
                        >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span
                              className={`material-symbols-outlined text-xl ${isSelected ? "text-[#febc85]" : "text-[#2c1810]"
                                }`}
                            >
                              {cfg.icon}
                            </span>
                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${isSelected
                                ? "bg-white/20 text-white"
                                : "bg-[#ede7e3] text-[#2c1810]"
                                }`}
                            >
                              {cfg.badgeText}
                            </span>
                          </div>

                          <span
                            className={`text-[13px] font-bold ${isSelected ? "text-white" : "text-[#1d1b19]"
                              }`}
                          >
                            {cfg.label}
                          </span>

                          <span
                            className={`text-[11px] mt-0.5 ${isSelected ? "text-[#febc85] font-semibold" : "text-[#827470]"
                              }`}
                          >
                            {cfg.extra === 0
                              ? "+0đ (Gốc)"
                              : `+${cfg.extra.toLocaleString("vi-VN")}đ${cfg.popular ? " (Phổ biến)" : ""
                              }`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Customization Step 2: NHIỆT ĐỘ & ĐÁ / ĐƯỜNG */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nhiệt độ */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold text-[#1d1b19] flex items-center gap-1.5 font-body">
                      <span className="material-symbols-outlined text-base text-[#845326]">
                        thermostat
                      </span>
                      {"Nhiệt độ (Temperature)".normalize("NFC")}
                    </span>

                    <div className="flex p-1 rounded-full bg-[#f8f2ee] border border-[#2c1810]/5">
                      <button
                        type="button"
                        onClick={() => setTemperature("iced")}
                        className={`flex-1 py-1.5 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 ${temperature === "iced"
                          ? "bg-[#2c1810] text-white shadow-sm"
                          : "text-[#504440] hover:text-[#1d1b19]"
                          }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          ac_unit
                        </span>
                        {"Uống Đá".normalize("NFC")}
                      </button>

                      <button
                        type="button"
                        onClick={() => setTemperature("hot")}
                        className={`flex-1 py-1.5 rounded-full text-[13px] font-bold transition-all flex items-center justify-center gap-1.5 ${temperature === "hot"
                          ? "bg-[#2c1810] text-white shadow-sm"
                          : "text-[#504440] hover:text-[#1d1b19]"
                          }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          local_fire_department
                        </span>
                        {"Uống Nóng".normalize("NFC")}
                      </button>
                    </div>
                  </div>

                  {/* Mức đường */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[13px] font-bold text-[#1d1b19] flex items-center gap-1.5 font-body">
                      <span className="material-symbols-outlined text-base text-[#845326]">
                        cookie
                      </span>
                      {"Mức đường (Sweetness)".normalize("NFC")}
                    </span>

                    <div className="grid grid-cols-4 gap-1 p-1 rounded-full bg-[#f8f2ee] border border-[#2c1810]/5">
                      {["100%", "70%", "50%", "0%"].map((lvl) => (
                        <button
                          key={lvl}
                          type="button"
                          onClick={() => setSweetness(lvl)}
                          className={`py-1 rounded-full text-[12px] font-bold transition-all text-center ${sweetness === lvl
                            ? "bg-[#2c1810] text-white shadow-sm"
                            : "text-[#504440] hover:bg-[#ede7e3]"
                            }`}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Mức đá (chỉ hiển thị khi chọn Uống Đá) */}
                {temperature === "iced" && (
                  <div className="flex flex-col gap-1.5 animate-fadeIn">
                    <span className="text-[13px] font-bold text-[#1d1b19] flex items-center gap-1.5 font-body">
                      <span className="material-symbols-outlined text-base text-[#845326]">
                        icecream
                      </span>
                      {"Lượng đá (Ice Amount)".normalize("NFC")}
                    </span>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-2xl sm:rounded-full bg-[#f8f2ee] border border-[#2c1810]/5">
                      {[
                        "Đá thường (100%)",
                        "Ít đá (70%)",
                        "50% Đá",
                        "Không đá (0%)",
                      ].map((iceOption) => (
                        <button
                          key={iceOption}
                          type="button"
                          onClick={() => setIceLevel(iceOption)}
                          className={`py-1.5 px-2 rounded-full text-[12px] font-bold transition-all text-center truncate ${iceLevel === iceOption
                            ? "bg-[#2c1810] text-white shadow-sm"
                            : "text-[#504440] hover:bg-[#ede7e3]"
                            }`}
                          title={iceOption}
                        >
                          {iceOption}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customization Step 3: CHỌN TOPPING (TOPPING SELECTOR) */}
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[#2c1810] text-white text-[11px] flex items-center justify-center font-bold font-body">
                        2
                      </span>
                      <span className="font-headline text-[16px] md:text-[18px] font-bold text-[#1d1b19]">
                        {"Thêm Topping Đặc Biệt".normalize("NFC")}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#827470] font-body">
                      {"Chọn nhiều món".normalize("NFC")}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" id="toppings-container">
                    {availableToppings.map((topping) => {
                      const isChecked = selectedToppingIds.includes(topping.id);

                      return (
                        <div
                          key={topping.id}
                          onClick={() => handleToggleTopping(topping.id)}
                          className={`flex items-center justify-between p-3.5 rounded-2xl transition-all cursor-pointer select-none ${isChecked
                            ? "bg-[#febc85]/20 border-2 border-[#845326] shadow-sm"
                            : "bg-[#f8f2ee] hover:bg-[#f3ede9] border border-[#2c1810]/10"
                            }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-6 h-6 rounded-md flex items-center justify-center transition-colors ${isChecked
                                ? "bg-[#845326] text-white"
                                : "bg-[#ede7e3] text-transparent"
                                }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                check
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[13px] font-bold text-[#1d1b19] font-body">
                                {topping.name}
                              </span>
                              <span className="text-[11px] text-[#827470] font-body">
                                {topping.subtext}
                              </span>
                            </div>
                          </div>

                          <span className="text-[13px] font-bold text-[#845326] font-body">
                            +{topping.price.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Customization: GHI CHÚ CHO BARISTA */}
            <div className="flex flex-col gap-2">
              <span className="text-[13px] font-bold text-[#1d1b19] flex items-center gap-1.5 font-body">
                <span className="material-symbols-outlined text-base text-[#845326]">
                  edit_note
                </span>
                {"Ghi chú riêng cho Barista".normalize("NFC")}
              </span>

              <div className="flex flex-wrap gap-1.5">
                {(isBakery ? BAKERY_NOTE_CHIPS : DRINK_NOTE_CHIPS).map((noteChip) => (
                  <button
                    key={noteChip}
                    type="button"
                    onClick={() => handleInsertNote(noteChip)}
                    className="px-3 py-1 rounded-full bg-[#f3ede9] text-[#504440] hover:bg-[#ede7e3] text-[11px] font-semibold transition-colors font-body"
                  >
                    {noteChip}
                  </button>
                ))}
              </div>

              <textarea
                value={baristaNotes}
                onChange={(e) => setBaristaNotes(e.target.value)}
                placeholder={
                  isBakery
                    ? "Ví dụ: Hâm thật nóng, để riêng bơ và mứt, bọc kín túi mang về...".normalize("NFC")
                    : "Ví dụ: Vui lòng cho ít đá, rắc thêm chút bột ca cao muối...".normalize("NFC")
                }
                rows={2}
                className="w-full px-4 py-2.5 rounded-2xl bg-[#f8f2ee] text-[13px] text-[#1d1b19] placeholder:text-[#827470] focus:outline-none focus:ring-2 focus:ring-[#845326] border border-[#2c1810]/10 resize-none font-body"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── STICKY BOTTOM CHECKOUT ACTION BAR ── */}
      <div className="sticky bottom-0 z-40 bg-[#fef8f4]/95 backdrop-blur-xl border-t border-[#2c1810]/10 px-4 md:px-8 py-3.5 shadow-2xl">
        <div className="max-w-[1280px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Order Summary & Loyalty Breakdown */}
          <div className="flex items-center gap-3.5 w-full md:w-auto">
            <div className="w-11 h-11 rounded-2xl bg-[#f3ede9] flex items-center justify-center shrink-0 border border-[#2c1810]/5">
              <span className="material-symbols-outlined text-2xl text-[#845326]">
                {isBakery ? "bakery_dining" : "coffee_maker"}
              </span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                {isBakery ? (
                  <>
                    <span className="text-[13px] font-bold text-[#1d1b19] font-body">
                      {"1 Phần".normalize("NFC")}
                    </span>
                    <span className="text-[#827470]">•</span>
                    <span className="text-[12px] text-[#504440] font-body">
                      {temperature === "hot" ? "Hâm nóng" : "Dùng ngay"}
                    </span>
                    <span className="text-[#827470]">•</span>
                    <span className="text-[12px] text-[#845326] font-semibold font-body">
                      {selectedToppingsList.length === 0
                        ? "Không ăn kèm".normalize("NFC")
                        : `${selectedToppingsList.length} món ăn kèm`}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[13px] font-bold text-[#1d1b19] font-body">
                      Size {selectedSize}
                    </span>
                    <span className="text-[#827470]">•</span>
                    <span className="text-[12px] text-[#504440] font-body">
                      {temperature === "iced" ? "Đá" : "Nóng"}
                    </span>
                    <span className="text-[#827470]">•</span>
                    <span className="text-[12px] text-[#845326] font-semibold font-body">
                      {selectedToppingsList.length === 0
                        ? "Không topping".normalize("NFC")
                        : `${selectedToppingsList.length} topping`}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-[#febc85]" />
                <span className="text-[11px] text-[#827470] font-body">
                  {"Tích lũy ".normalize("NFC")}
                  <strong className="text-[#1d1b19]">
                    +{Math.max(1, Math.floor(totalPrice / 1000))} Điểm Hạt Vàng
                  </strong>{" "}
                  BrewLite Club
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Quantity & Dynamic CTA Button */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Stepper Quantity */}
            <div className="flex items-center bg-[#f3ede9] rounded-full p-1 border border-[#2c1810]/5">
              <button
                type="button"
                onClick={() => handleQtyChange(-1)}
                aria-label="Giảm số lượng"
                className="w-9 h-9 rounded-full bg-white hover:bg-[#ede7e3] flex items-center justify-center text-[#1d1b19] transition-all active:scale-90 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">remove</span>
              </button>
              <span className="font-headline text-[16px] w-9 text-center font-bold text-[#2c1810] select-none">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => handleQtyChange(1)}
                aria-label="Tăng số lượng"
                className="w-9 h-9 rounded-full bg-white hover:bg-[#ede7e3] flex items-center justify-center text-[#1d1b19] transition-all active:scale-90 shadow-sm"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
            </div>

            {/* Dynamic CTA Button */}
            <button
              type="button"
              onClick={handleAddToCartClick}
              className="flex-1 md:flex-initial flex items-center justify-center gap-2 bg-[#2c1810] hover:bg-[#351300] text-white px-6 md:px-8 py-3.5 rounded-2xl font-body font-bold text-[14px] transition-all shadow-md active:scale-[0.98] cursor-pointer group"
              id="add-to-cart-btn"
            >
              <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">
                {actionLabel ? "edit_note" : "shopping_bag"}
              </span>
              <span>{`${actionLabel || "Thêm vào giỏ hàng"} • `}</span>
              <span className="text-[#febc85] font-extrabold">
                {totalPrice.toLocaleString("vi-VN")}đ
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // If used as modal overlay
  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-fadeIn">
        <div
          className="fixed inset-0"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className="relative w-full max-w-5xl bg-[#fef8f4] md:rounded-3xl shadow-2xl overflow-hidden max-h-[100vh] md:max-h-[92vh] flex flex-col z-10 my-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="overflow-y-auto flex-1">{content}</div>
        </div>
      </div>
    );
  }

  // Standalone page layout
  return content;
}

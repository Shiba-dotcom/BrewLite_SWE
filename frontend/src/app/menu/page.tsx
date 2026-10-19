"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import Footer from "../components/Footer";
import Header from "../components/Header";
import ProductDetailModal, {
  CustomizationDetails,
} from "../components/ProductDetailModal";
import { useCartStore } from "../store/cartStore";

export interface Product {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  category?: string;
  rating?: number;
  tag?: string;
  chips?: {
    temps?: string[];
    note?: string;
  };
}

// CartItem type is now owned by the Zustand store.
// Re-export it here so existing imports don't break.
export type { CartItem } from "../store/cartStore";

/**
 * Standardize Stitch image URLs by stripping any existing query
 * and appending high-resolution query parameters as required by design.md:
 * [url_gốc_không_có_query]?auto=format&fit=crop&w=1200&q=85
 */
export function normalizeStitchImageUrl(
  url: string | null | undefined,
  width = 1200,
  quality = 85
): string {
  if (!url) return "";
  if (url.startsWith("/") || !url.startsWith("http")) return url;
  const baseUrl = url.split("?")[0];
  return `${baseUrl}?auto=format&fit=crop&w=${width}&q=${quality}`;
}

// Real Product Menu with Local Images & NFC normalization
export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Cà phê Đen".normalize("NFC"),
    description:
      "Chiết xuất từ hạt Robusta và Arabica rang đậm mộc, mang vị đắng êm sâu lắng, hậu vị thanh nhẹ và hương thơm nồng nàn nguyên bản.".normalize("NFC"),
    imageUrl: "/images/products/ca-phe-den.png",
    basePrice: 29000,
    category: "vietnamese",
    rating: 4.9,
    tag: "Đậm đà",
    chips: { temps: ["Hot", "Iced"], note: "Robusta mộc" },
  },
  {
    id: 2,
    name: "Cà phê Sữa".normalize("NFC"),
    description:
      "Sự kết hợp kinh điển giữa cà phê pha phin truyền thống đậm đà và sữa đặc sánh mịn. Từng giọt cà phê loang tự nhiên qua đá viên tạo nên vị ngọt béo, đắng dịu hài hòa.".normalize("NFC"),
    imageUrl: "/images/products/ca-phe-sua.png",
    basePrice: 35000,
    category: "vietnamese",
    rating: 5.0,
    tag: "Truyền thống",
    chips: { temps: ["Hot", "Iced"], note: "Phin truyền thống" },
  },
  {
    id: 3,
    name: "Cà phê Bạc Xỉu".normalize("NFC"),
    description:
      "Dòng sữa tươi thanh béo quyện cùng chút sữa đặc ngọt dịu, điểm xuyết một lớp cà phê phin thơm nhẹ trên bề mặt, mang hương vị dịu êm, ngậy béo và dễ uống.".normalize("NFC"),
    imageUrl: "/images/products/ca-phe-bac-xiu.png",
    basePrice: 39000,
    category: "vietnamese",
    rating: 4.9,
    tag: "Béo ngậy",
    chips: { temps: ["Hot", "Iced"], note: "Dịu ngọt êm ái" },
  },
  {
    id: 4,
    name: "Cà phê Muối".normalize("NFC"),
    description:
      "Nền cà phê sữa đá đậm vị hòa quyện cùng lớp kem bọt muối biển sánh mịn, béo mặn bồng bềnh bên trên, rắc nhẹ bột cacao nguyên chất tạo điểm nhấn tròn vị.".normalize("NFC"),
    imageUrl: "/images/products/ca-phe-muoi.png",
    basePrice: 42000,
    category: "vietnamese",
    rating: 5.0,
    tag: "Đặc sản",
    chips: { temps: ["Iced"], note: "Kem muối biển" },
  },
  {
    id: 5,
    name: "Iced Caramel Macchiato".normalize("NFC"),
    description:
      "Cà phê espresso phân tầng tinh tế cùng sữa tươi mát lạnh và siro vani ngọt dịu, phủ lớp bọt sữa dày mịn đan xen những đường sốt caramel vàng óng thơm ngậy.".normalize("NFC"),
    imageUrl: "/images/products/iced-caramel-macchiato.png",
    basePrice: 49000,
    category: "espresso",
    rating: 4.9,
    tag: "Signature",
    chips: { temps: ["Hot", "Iced"], note: "Caramel vàng óng" },
  },
  {
    id: 6,
    name: "Matcha Latte Uji".normalize("NFC"),
    description:
      "Bột trà xanh Uji cao cấp từ Nhật Bản được đánh bọt mịn màng, hòa cùng dòng sữa tươi béo nhẹ. Thức uống mang sắc xanh ngọc bích, vị chát thanh dịu và hậu ngọt êm ái.".normalize("NFC"),
    imageUrl: "/images/products/matcha-latte.png",
    basePrice: 49000,
    category: "tea",
    rating: 4.9,
    tag: "Uji Kyoto",
    chips: { temps: ["Hot", "Iced"], note: "100% Ceremonial" },
  },
  {
    id: 7,
    name: "Trà Đào Cam Sả".normalize("NFC"),
    description:
      "Nền trà đen ủ lạnh ngát hương sả tươi tự nhiên, kết hợp cùng vị chua ngọt sảng khoái của tép cam vàng tươi và miếng đào giòn mọng, giúp thanh nhiệt tức thì.".normalize("NFC"),
    imageUrl: "/images/products/tra-dao-cam-sa.png",
    basePrice: 45000,
    category: "tea",
    rating: 4.8,
    tag: "Thanh nhiệt",
    chips: { temps: ["Iced"], note: "Cam vàng & Đào tươi" },
  },
  {
    id: 8,
    name: "Bánh Pain au Chocolat".normalize("NFC"),
    description:
      "Lớp vỏ bánh ngàn lớp xốp giòn ôm trọn hai thanh sô-cô-la đen đậm vị tan chảy ở giữa. Sự kết hợp hoàn hảo giữa độ giòn béo của bơ và vị đắng ngọt tinh tế.".normalize("NFC"),
    imageUrl: "/images/products/pain-au-chocolat.png",
    basePrice: 39000,
    category: "bakery",
    rating: 4.9,
    tag: "Bơ Pháp & Socola",
    chips: { note: "🔥 Nướng thơm giòn" },
  },
  {
    id: 9,
    name: "Basque Burnt Cheesecake".normalize("NFC"),
    description:
      "Bánh phô mai nướng cháy xém bề mặt theo phong cách xứ Basque, đượm hương caramel nướng đặc trưng. Cốt bánh mềm ngậy, mịn tan và có hậu chua thanh nhẹ từ kem phô mai.".normalize("NFC"),
    imageUrl: "/images/products/basque-burnt-cheesecake.png",
    basePrice: 45000,
    category: "bakery",
    rating: 5.0,
    tag: "Xứ Basque",
    chips: { note: "✨ Phô mai nướng cháy" },
  },
  {
    id: 10,
    name: "Classic Tiramisu".normalize("NFC"),
    description:
      "Cốt bánh ladyfinger mềm mại thấm đẫm cà phê espresso đậm đặc, xen kẽ các lớp kem phô mai mascarpone béo mịn và phủ bề mặt bằng lớp bột cacao thơm bùi, đắng nhẹ.".normalize("NFC"),
    imageUrl: "/images/products/classic-tiramisu.png",
    basePrice: 49000,
    category: "bakery",
    rating: 5.0,
    tag: "Ý truyền thống",
    chips: { note: "☕ Thấm đẫm Espresso" },
  },
];

export function getProductMetadata(name: string): {
  category: string;
  tag?: string;
  rating?: number;
  chips?: { temps?: string[]; note?: string };
} {
  const n = name.toLowerCase();
  if (
    n.includes("đen") ||
    n.includes("sữa") ||
    n.includes("bạc xỉu") ||
    n.includes("muối") ||
    n.includes("phin")
  ) {
    return {
      category: "vietnamese",
      tag: n.includes("muối")
        ? "Đặc sản"
        : n.includes("bạc xỉu")
        ? "Béo ngậy"
        : n.includes("đen")
        ? "Đậm đà"
        : "Truyền thống",
      rating: 4.9,
      chips: {
        temps: n.includes("muối") ? ["Iced"] : ["Hot", "Iced"],
        note: "Phin Robusta",
      },
    };
  }
  if (
    n.includes("macchiato") ||
    n.includes("espresso") ||
    n.includes("cappuccino") ||
    (n.includes("latte") && !n.includes("matcha"))
  ) {
    return {
      category: "espresso",
      tag: "Signature",
      rating: 4.9,
      chips: { temps: ["Hot", "Iced"], note: "Espresso mộc" },
    };
  }
  if (n.includes("matcha") || n.includes("trà") || n.includes("tea")) {
    return {
      category: "tea",
      tag: n.includes("matcha") ? "Uji Kyoto" : "Thanh nhiệt",
      rating: 4.8,
      chips: {
        temps: n.includes("matcha") ? ["Hot", "Iced"] : ["Iced"],
        note: n.includes("matcha") ? "100% Ceremonial" : "Cam đào tươi",
      },
    };
  }
  if (
    n.includes("bánh") ||
    n.includes("croissant") ||
    n.includes("pain") ||
    n.includes("cake") ||
    n.includes("tiramisu") ||
    n.includes("cheesecake")
  ) {
    return {
      category: "bakery",
      tag: n.includes("cheesecake")
        ? "Xứ Basque"
        : n.includes("tiramisu")
        ? "Ý truyền thống"
        : "Nướng giòn",
      rating: 5.0,
      chips: { note: "🔥 Nướng thơm giòn" },
    };
  }
  return {
    category: "vietnamese",
    tag: "Phổ biến",
    rating: 4.8,
    chips: { temps: ["Hot", "Iced"] },
  };
}

const CATEGORIES = [
  { id: "all", label: "All Items" },
  { id: "espresso", label: "Signature Espresso" },
  { id: "vietnamese", label: "Vietnamese & Phin" },
  { id: "tea", label: "Artisan Teas & Matchas" },
  { id: "coldbrew", label: "Cold Brew Craft" },
  { id: "bakery", label: "Fresh Bakery & Pastries" },
];

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters & Search
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [tempFilter, setTempFilter] = useState<string>("all");

  // Selected temperature per product
  const [productTemps, setProductTemps] = useState<Record<number, string>>({});

  // Cart via Zustand store
  const { addItem, cartCount, cartTotal } = useCartStore();
  const [badgeAnimated, setBadgeAnimated] = useState<boolean>(false);

  // Promo code
  const [promoApplied, setPromoApplied] = useState<boolean>(false);

  // Fetch products from NestJS API (GET /products) with Stitch URL normalization
  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      setIsLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const response = await fetch(`${apiUrl}/products`, {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`API ${response.status} ${response.statusText}`);
        }

        const data: Product[] = await response.json();
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            setProducts(
              data.map((p) => {
                const meta = getProductMetadata(p.name);
                return {
                  ...p,
                  name: p.name.normalize("NFC"),
                  description: p.description ? p.description.normalize("NFC") : null,
                  imageUrl: normalizeStitchImageUrl(p.imageUrl, 1200, 85),
                  category: p.category || meta.category,
                  tag: p.tag || meta.tag,
                  rating: p.rating || meta.rating,
                  chips: p.chips || meta.chips,
                };
              })
            );
          } else {
            setProducts(DEFAULT_PRODUCTS);
          }
        }
      } catch {
        if (isMounted) {
          setProducts(DEFAULT_PRODUCTS);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCategory === "all" ||
        (p.category && p.category.toLowerCase() === selectedCategory.toLowerCase());

      const matchSearch =
        searchQuery.trim() === "" ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchTemp =
        tempFilter === "all" ||
        (p.chips?.temps && p.chips.temps.some((t) => t.toLowerCase() === tempFilter.toLowerCase())) ||
        (tempFilter === "oat" && (p.name.toLowerCase().includes("oat") || p.description?.toLowerCase().includes("oat")));

      return matchCat && matchSearch && matchTemp;
    });
  }, [products, selectedCategory, searchQuery, tempFilter]);

  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Cart count & total derived from Zustand store (hydrated on client)
  const count = hydrated ? cartCount() : 0;
  const total = hydrated ? cartTotal() : 0;

  // Product Detail Modal state (Task 4)
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<Product | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleOpenDetail = (product: Product) => {
    setSelectedProductForDetail(product);
    setIsDetailModalOpen(true);
  };

  const handleCustomizedAddToCart = (
    product: Product,
    customization: CustomizationDetails
  ) => {
    addItem({
      id: product.id,
      name: product.name,
      price: customization.unitPrice,
      temp: customization.temp,
      quantity: customization.quantity,
      size: customization.size,
      toppings: customization.toppings.map((t) => t.name),
      notes: customization.notes,
      imageUrl: product.imageUrl,
    });

    setBadgeAnimated(true);
    setTimeout(() => setBadgeAnimated(false), 300);
  };

  const handleAddToCart = (product: Product) => {
    const defaultTemp = product.chips?.temps ? product.chips.temps[0] : "Iced";
    const temp = productTemps[product.id] || defaultTemp;

    addItem({
      id: product.id,
      name: product.name,
      price: product.basePrice,
      temp,
      quantity: 1,
      imageUrl: product.imageUrl,
    });

    setBadgeAnimated(true);
    setTimeout(() => setBadgeAnimated(false), 300);
  };

  const handleSelectTemp = (productId: number, temp: string) => {
    setProductTemps((prev) => ({
      ...prev,
      [productId]: temp,
    }));
  };

  const handleApplyPromo = () => {
    setPromoApplied(true);
    alert(
      "Code 'BREWCOZY' applied! 15% discount will reflect instantly on your contactless tap checkout."
    );
  };

  return (
    <div className="min-h-screen bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body selection:bg-[#fedcc2] selection:text-[#2c1810]">
      {/* ── HEADER (STANDARDIZED COMPONENT) ── */}
      <Header
        cartCount={count}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeTab="menu"
        badgeAnimated={badgeAnimated}
      />

      {/* ── TOP WELCOME & LOCATION SCRIM BANNER ── */}
      <section className="relative w-full overflow-hidden bg-[#f8f2ee] px-4 md:px-8 lg:px-12 py-6 lg:py-10">
        <div className="max-w-[1280px] mx-auto flex flex-col gap-6">
          {/* Roastery Live Status & Notice Strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-[#fef8f4] p-2.5 md:px-4 rounded-2xl shadow-sm border border-[#2c1810]/5">
            <div className="flex items-center gap-2 min-w-0">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#febc85] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#845326]" />
              </span>
              <div className="flex items-center gap-1.5 truncate text-[13px] font-body">
                <span className="text-[#1d1b19] font-semibold truncate">
                  Downtown Roastery Bar
                </span>
                <span className="text-[#504440] text-[13px] hidden sm:inline">
                  • 124 Le Loi, D1
                </span>
                <span className="bg-[#ffdcc2] text-[#2e1500] px-2 py-0.5 rounded-full text-[11px] font-bold">
                  Wait ~4 mins
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                className="flex items-center gap-1 text-[11px] font-bold text-[#845326] hover:text-[#504440] transition-colors px-3 py-1 rounded-full bg-[#f3ede9] font-body"
                id="locBtn"
              >
                <span>Change Bar</span>
                <span className="material-symbols-outlined text-sm">
                  swap_horiz
                </span>
              </button>
            </div>
          </div>

          {/* Hero Headline Layout with Asymmetrical Coffee Imagery Card */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-7 flex flex-col gap-4">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ffdbce] text-[#2a170f] text-[11px] font-bold tracking-wide uppercase font-body">
                  <span className="material-symbols-outlined text-xs">bolt</span>{" "}
                  Instant Express Ordering
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#ede7e3] text-[#1d1b19] text-[11px] font-bold font-body">
                  <span className="material-symbols-outlined text-xs">
                    coffee_maker
                  </span>{" "}
                  100% Single-Origin Arabica
                </span>
              </div>

              <h1 className="font-headline text-[36px] lg:text-[48px] font-bold text-[#090100] leading-tight tracking-tight">
                Skip the line, <br className="hidden sm:inline" />
                <span className="text-[#845326] italic">
                  order your cozy cup.
                </span>
              </h1>

              <p className="text-[16px] lg:text-[18px] text-[#504440] max-w-xl leading-relaxed font-body">
                Handcrafted espresso, artisan cold brews, and fresh morning
                pastries prepared immediately to order. Tap your taste, check
                out contactless, and grab warmth without the counter queue.
              </p>

              {/* Interactive Search & Express Filter Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1 bg-[#fef8f4] p-1.5 rounded-2xl shadow-sm mt-1 border border-[#2c1810]/5">
                <div className="flex items-center flex-1 px-3 gap-2 text-[#504440]">
                  <span className="material-symbols-outlined text-xl text-[#845326]">
                    search
                  </span>
                  <input
                    className="w-full bg-transparent py-2 text-[15px] text-[#1d1b19] placeholder:text-[#827470] focus:outline-none font-body"
                    id="searchDrinks"
                    placeholder={"Search caramel, phin muối, matcha, oat...".normalize("NFC")}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="text-xs text-[#827470] hover:text-[#1d1b19] px-1 font-body"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 overflow-x-auto py-1 sm:py-0 px-1 border-t sm:border-t-0 border-[#2c1810]/5 font-body">
                  <button
                    type="button"
                    onClick={() => setTempFilter("all")}
                    className={`filter-pill px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      tempFilter === "all"
                        ? "bg-[#2c1810] text-white"
                        : "bg-[#f3ede9] text-[#504440] hover:bg-[#ede7e3]"
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempFilter("iced")}
                    className={`filter-pill px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      tempFilter === "iced"
                        ? "bg-[#2c1810] text-white"
                        : "bg-[#f3ede9] text-[#504440] hover:bg-[#ede7e3]"
                    }`}
                  >
                    🧊 Iced
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempFilter("hot")}
                    className={`filter-pill px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      tempFilter === "hot"
                        ? "bg-[#2c1810] text-white"
                        : "bg-[#f3ede9] text-[#504440] hover:bg-[#ede7e3]"
                    }`}
                  >
                    ☕ Hot
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempFilter("oat")}
                    className={`filter-pill px-3 py-1.5 rounded-full text-[11px] font-bold transition-all ${
                      tempFilter === "oat"
                        ? "bg-[#2c1810] text-white"
                        : "bg-[#f3ede9] text-[#504440] hover:bg-[#ede7e3]"
                    }`}
                  >
                    🌾 Oat
                  </button>
                </div>
              </div>
            </div>

            {/* Asymmetrical Feature Hero Vignette (Barista Spotlight - Original Stitch URL) */}
            <div className="lg:col-span-5 relative">
              <div
                className="relative rounded-3xl overflow-hidden shadow-xl bg-[#ede7e3] aspect-4/3 group cursor-pointer"
                onClick={() =>
                  handleOpenDetail(
                    products.find((p) => p.id === 2) || DEFAULT_PRODUCTS[1]
                  )
                }
                title={"Xem chi tiết & Tùy chọn Cà Phê Muối".normalize("NFC")}
              >
                <Image
                  src={normalizeStitchImageUrl(
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuAYAWNv7xan_IBhkVnDwTw9ytyeJzEWqGL2xrdQkStMsLr84eJr6AYLJMbTWrqZyFYH3bSYACwcwaM5V8yPF-X64NNkPJWgjZn7qd4UvLYlxz6EmM78WzjqR6R4a-hUXrw-n6SmQ68flgxEqJ3IEME8TTurzNVLddbbUtLO3uTbX859LBRKKkH3y6b3BtoIBFyGKkaxsEGKtncc48Ap-tUAoQnzI4gJzJnuB-KDy0q_9uIEIHQyxT5XQw",
                    1600,
                    90
                  )}
                  alt={"Cà Phê Muối & Salted Sweet Cloud".normalize("NFC")}
                  fill
                  priority
                  unoptimized
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 42vw"
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#2c1810]/85 via-[#2c1810]/25 to-transparent flex flex-col justify-end p-6 text-white">
                  <div className="flex items-center gap-2 mb-1 font-body">
                    <span className="bg-[#febc85] text-[#78491d] px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider">
                      Barista Spotlight
                    </span>
                    <span className="text-[11px] font-bold text-[#e3bfb2]">
                      Fresh micro-batch
                    </span>
                  </div>
                  <h2 className="font-headline text-[20px] lg:text-[22px] text-white leading-tight font-bold tracking-tight">
                    {"Cà Phê Muối & Salted Sweet Cloud".normalize("NFC")}
                  </h2>
                  <p className="text-[13px] text-[#e3bfb2] line-clamp-1 mt-0.5 font-body">
                    {"Slow-dripped Da Lat dark roast with silky fleur de sel foam.".normalize("NFC")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── LIVE CASHLESS ORDERING PROMOTION BAR ── */}
      <section className="w-full bg-[#2c1810] text-white py-2.5 px-4 md:px-8 border-y border-[#351300]">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#febc85] text-lg">
              local_fire_department
            </span>
            <p className="text-[13px] text-[#fef8f4] font-body">
              <strong className="font-semibold text-[#febc85]">
                Happy Hour Cashless Perk:
              </strong>{" "}
              {("Get 15% off any Vietnamese Cà Phê Sữa with code ").normalize("NFC")}
              <span className="bg-white/20 px-1.5 py-0.5 rounded font-mono font-bold text-white">
                BREWCOZY
              </span>{" "}
              at checkout.
            </p>
          </div>
          <div className="flex items-center gap-3 text-[#9e7e73] text-[11px] font-bold font-body">
            <span className="hidden md:inline">Valid today until 4:00 PM</span>
            <button
              type="button"
              className="bg-[#febc85] text-[#78491d] px-3.5 py-1 rounded-full text-[11px] hover:bg-[#ffdcc2] transition-colors font-semibold"
              onClick={handleApplyPromo}
            >
              {promoApplied ? "Code Applied!" : "Apply Code"}
            </button>
          </div>
        </div>
      </section>

      {/* ── MAIN MENU CATALOG SECTION ── */}
      <main className="w-full max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-8 flex flex-col gap-6 flex-1">
        {/* Category Tabs Navigation */}
        <div className="w-full flex items-center justify-between gap-4 overflow-x-auto pb-2 scrollbar-none border-b border-[#2c1810]/5">
          <div className="flex items-center gap-2 whitespace-nowrap" id="categoryTabs">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategory === cat.id;
              const count =
                cat.id === "all"
                  ? products.length
                  : products.filter((p) => p.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`cat-pill flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-semibold transition-all font-body ${
                    isActive
                      ? "active bg-[#2c1810] text-white shadow-sm"
                      : "bg-[#f3ede9] text-[#504440] hover:bg-[#ede7e3]"
                  }`}
                >
                  <span>{cat.label}</span>
                  {count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.2 rounded-full ${
                        isActive
                          ? "bg-[#845326] text-white"
                          : "bg-[#d3c3be] text-[#2c1810]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Quick Sort / View Toggle */}
          <div className="hidden lg:flex items-center gap-2 bg-[#f3ede9] p-1 rounded-full text-[#504440] font-body">
            <span className="text-[11px] font-bold px-2 text-[#827470]">
              Sort:
            </span>
            <button
              type="button"
              className="px-3 py-0.5 rounded-full bg-white text-[#1d1b19] text-[11px] font-bold shadow-sm"
            >
              Recommended
            </button>
            <button
              type="button"
              className="px-3 py-0.5 rounded-full hover:text-[#1d1b19] text-[11px] font-bold"
            >
              Rating
            </button>
          </div>
        </div>

        {/* ── PRODUCT GRID: 8 HANDCRAFTED ITEMS WITH 100% STITCH IMAGES ── */}
        {isLoading ? (
          /* Skeleton Loading */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-[#f8f2ee] rounded-2xl p-3 flex flex-col justify-between border border-[#2c1810]/5 animate-pulse"
              >
                <div className="w-full aspect-square rounded-xl bg-[#ede7e3] mb-3" />
                <div className="flex flex-col gap-2 flex-1">
                  <div className="h-4 bg-[#ede7e3] rounded w-3/4" />
                  <div className="h-3 bg-[#ede7e3] rounded w-full" />
                  <div className="h-3 bg-[#ede7e3] rounded w-2/3" />
                  <div className="h-5 bg-[#ede7e3] rounded-full w-20 mt-2" />
                </div>
                <div className="flex items-center justify-between mt-4 pt-2 border-t border-[#2c1810]/5">
                  <div className="h-5 bg-[#ede7e3] rounded w-16" />
                  <div className="h-9 bg-[#ede7e3] rounded-xl w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* Empty State */
          <div className="bg-[#f8f2ee] rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-4 border border-[#2c1810]/10 my-6">
            <div className="w-14 h-14 rounded-2xl bg-[#ffdcc2] text-[#845326] flex items-center justify-center text-2xl shadow-inner">
              ☕
            </div>
            <h3 className="font-headline text-xl font-bold text-[#2c1810]">
              No drinks found matching your search.
            </h3>
            <p className="text-[13px] text-[#504440] max-w-md font-body">
              Try searching with different keywords like caramel, matcha, oat, or reset all active filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setTempFilter("all");
              }}
              className="mt-2 px-5 py-2 rounded-full bg-[#2c1810] text-white text-xs font-semibold hover:bg-[#845326] transition-colors shadow-sm font-body"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* High-DPI Retina Product Grid with 100% Original Stitch Images */
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            id="productGrid"
          >
            {filteredProducts.map((product, idx) => {
              const defaultTemp = product.chips?.temps ? product.chips.temps[0] : "Iced";
              const currentTemp = productTemps[product.id] || defaultTemp;

              return (
                <article
                  key={product.id}
                  className="product-card flex flex-col justify-between bg-[#f8f2ee] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 p-3.5 group border border-[#2c1810]/5 cursor-pointer"
                  onClick={() => handleOpenDetail(product)}
                >
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-[#ede7e3]">
                    <Image
                      src={normalizeStitchImageUrl(
                        product.imageUrl || DEFAULT_PRODUCTS[0].imageUrl,
                        1200,
                        85
                      )}
                      alt={product.name}
                      fill
                      unoptimized
                      loading={idx < 4 ? "eager" : "lazy"}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {product.tag && (
                      <div className="absolute top-2 left-2 z-10 flex flex-col gap-1 font-body">
                        <span className="bg-[#febc85] text-[#78491d] text-[11px] px-2 py-0.5 rounded-full font-semibold shadow-sm">
                          {product.tag}
                        </span>
                      </div>
                    )}

                    <div className="absolute bottom-2 right-2 z-10 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm font-body">
                      <span className="material-symbols-outlined text-xs text-[#845326] material-symbols-fill">
                        star
                      </span>
                      <span className="text-[11px] font-bold text-[#1d1b19]">
                        {product.rating ?? "4.9"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 mt-3 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="font-headline text-[18px] text-[#1d1b19] font-bold leading-snug tracking-tight">
                        {product.name}
                      </h3>
                    </div>
                    <p className="text-[13px] text-[#504440] line-clamp-2 font-body leading-relaxed">
                      {product.description}
                    </p>

                    {/* Chips & Temperature selectors */}
                    <div className="flex items-center gap-1 mt-1.5 font-body">
                      {product.chips?.temps && product.chips.temps.length > 0 ? (
                        <>
                          {product.chips.temps.map((temp) => (
                            <button
                              key={temp}
                              type="button"
                              onClick={() => handleSelectTemp(product.id, temp)}
                              className={`temp-chip px-2.5 py-0.5 rounded-full text-xs font-semibold transition-all ${
                                currentTemp === temp
                                  ? "bg-[#2c1810] text-white"
                                  : "bg-white text-[#504440] hover:bg-[#ede7e3]"
                              }`}
                            >
                              {temp}
                            </button>
                          ))}
                        </>
                      ) : null}

                      {product.chips?.note && (
                        <span className="text-[#845326] text-[11px] font-semibold ml-auto font-body">
                          {product.chips.note}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#2c1810]/5 font-body">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-[#827470] uppercase tracking-wider font-bold">
                        Price
                      </span>
                      <span className="font-body text-[18px] font-bold text-[#1d1b19]">
                        {product.basePrice.toLocaleString("vi-VN")}đ
                      </span>
                    </div>

                    <button
                      type="button"
                      className="h-10 px-4 rounded-xl bg-[#2c1810] hover:bg-[#845326] text-white flex items-center gap-1.5 transition-all active:scale-95 shadow-sm text-[13px] font-semibold font-body cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(product);
                      }}
                      title={"Tùy chọn món & Thêm vào giỏ".normalize("NFC")}
                    >
                      <span className="material-symbols-outlined text-lg">
                        tune
                      </span>
                      <span>{"Tùy chọn".normalize("NFC")}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* ── CRAFT ROASTING & CONTACTLESS ASSURANCE BENTO SECTION ── */}
        <section className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#f3ede9] p-6 rounded-2xl flex flex-col gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#febc85] text-[#78491d] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">
                qr_code_scanner
              </span>
            </div>
            <h4 className="font-headline text-[18px] font-bold text-[#1d1b19]">
              100% Cashless Pickup
            </h4>
            <p className="text-[13px] text-[#504440] leading-relaxed font-body">
              Tap your phone via Apple Pay, MoMo, or Card. No paper receipts, zero bill counting delays.
            </p>
          </div>

          <div className="bg-[#f3ede9] p-6 rounded-2xl flex flex-col gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#2c1810] text-white flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">timer</span>
            </div>
            <h4 className="font-headline text-[18px] font-bold text-[#1d1b19]">
              Barista Ready Notifications
            </h4>
            <p className="text-[13px] text-[#504440] leading-relaxed font-body">
              Receive a warm ping when your espresso hits the counter so you savor maximum crema and temperature.
            </p>
          </div>

          <div className="bg-[#f3ede9] p-6 rounded-2xl flex flex-col gap-2">
            <div className="w-12 h-12 rounded-xl bg-[#e7e1dd] text-[#1d1b19] flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl">eco</span>
            </div>
            <h4 className="font-headline text-[18px] font-bold text-[#1d1b19]">
              Sustainable Cups &amp; Beans
            </h4>
            <p className="text-[13px] text-[#504440] leading-relaxed font-body">
              Compostable cornstarch lids, recycled craft sleeves, and ethically sourced single-origin highland beans.
            </p>
          </div>
        </section>
      </main>

      {/* ── STICKY BOTTOM EXPRESS CART FLOATING WIDGET ── */}
      <aside className="sticky bottom-4 z-40 w-full px-4 md:px-8 lg:px-12 pointer-events-none mt-4">
        <div className="max-w-[1280px] mx-auto pointer-events-auto">
          <div className="bg-[#2c1810] text-white rounded-2xl p-2.5 px-4 shadow-xl flex items-center justify-between gap-4 backdrop-blur-lg">
            <div className="flex items-center gap-4 min-w-0">
              <div className="relative w-12 h-12 rounded-xl bg-[#351300] flex items-center justify-center text-[#febc85] shrink-0">
                <span className="material-symbols-outlined text-2xl text-[#febc85]">
                  shopping_bag
                </span>
                <span
                  suppressHydrationWarning
                  className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#845326] text-white text-[11px] font-bold flex items-center justify-center font-body transition-transform ${
                    badgeAnimated ? "scale-125" : "scale-100"
                  }`}
                  id="cartCountBadge"
                >
                  {count}
                </span>
              </div>
              <div className="flex flex-col truncate font-body">
                <div className="flex items-center gap-1.5">
                  <span
                    suppressHydrationWarning
                    className="text-[15px] font-bold text-white font-body"
                    id="cartSummaryText"
                  >
                    {count === 0
                      ? "Your Cup is empty"
                      : count === 1
                      ? `1 Item in Cup (${total.toLocaleString("vi-VN")}đ)`
                      : `${count} Items in Cup (${total.toLocaleString("vi-VN")}đ)`}
                  </span>
                  <span className="hidden sm:inline text-[#e3bfb2] text-[13px]">
                    • Downtown Roastery
                  </span>
                </div>
                <p className="text-[13px] text-[#e3bfb2] truncate font-body">
                  {"Pha xong trong ~4 phút sau thanh toán".normalize("NFC")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:flex flex-col font-body">
                <span className="text-[11px] text-[#e3bfb2]">Subtotal</span>
                <span
                  suppressHydrationWarning
                  className="font-body text-[18px] font-bold text-[#fef8f4]"
                  id="cartTotalText"
                >
                  {total.toLocaleString("vi-VN")}đ
                </span>
              </div>
              <Link
                href="/cart"
                className="h-12 px-6 rounded-xl bg-[#febc85] hover:bg-[#ffdcc2] text-[#78491d] text-[15px] font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-md font-body"
                id="checkoutBtn"
              >
                <span>{"Xem giỏ hàng".normalize("NFC")}</span>
                <span className="material-symbols-outlined text-lg">
                  arrow_forward
                </span>
              </Link>
            </div>
          </div>
        </div>
      </aside>

      {/* ── PRODUCT DETAIL CUSTOMIZATION MODAL (TASK 4) ── */}
      <ProductDetailModal
        product={selectedProductForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={handleCustomizedAddToCart}
        isModal={true}
      />

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}

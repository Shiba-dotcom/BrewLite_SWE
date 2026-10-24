"use client";

export interface ProductRecipeItem {
  id: number;
  size: string;
  amount: number;
  ingredient: {
    id: number;
    code: string;
    name: string;
    unit: string;
    stock: number;
  };
}

export interface Product {
  id: number;
  name: string;
  description: string | null;
  imageUrl: string | null;
  basePrice: number;
  sizeUpchargeM?: number | null;
  sizeUpchargeL?: number | null;
  stock?: number;
  isOutOfStock?: boolean;
  availableServings?: number;
  recipes?: ProductRecipeItem[];
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

export function getProductMetadata(
  name: string,
  categoryOverride?: string
): {
  category: string;
  tag?: string;
  rating?: number;
  chips?: { temps?: string[]; note?: string };
} {
  const n = name.toLowerCase();
  if (
    categoryOverride === "bakery" ||
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
  if (categoryOverride === "coldbrew" || n.includes("cold brew") || n.includes("ủ lạnh")) {
    return {
      category: "coldbrew",
      tag: "Cold Brew",
      rating: 4.9,
      chips: { temps: ["Iced"], note: "Ủ lạnh 18h" },
    };
  }
  if (
    categoryOverride === "tea" ||
    n.includes("matcha") ||
    n.includes("trà") ||
    n.includes("tea")
  ) {
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
    categoryOverride === "espresso" ||
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
  if (
    categoryOverride === "vietnamese" ||
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
  return {
    category: categoryOverride || "vietnamese",
    tag: "Phổ biến",
    rating: 4.8,
    chips: { temps: ["Hot", "Iced"] },
  };
}


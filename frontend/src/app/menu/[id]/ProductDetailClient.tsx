"use client";

import React, { use, useState, useEffect } from "react";
import { notFound, useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import ProductDetailModal, {
  CustomizationDetails,
} from "../../components/ProductDetailModal";
import {
  Product,
  DEFAULT_PRODUCTS,
  getProductMetadata,
  normalizeStitchImageUrl,
} from "../page";
import { useCartStore, isBakeryProduct } from "../../store/cartStore";

export default function ProductDetailClient({
  paramsPromise,
}: {
  paramsPromise: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(paramsPromise);
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  const productId = parseInt(unwrappedParams.id, 10);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setLoading(true);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
        const res = await fetch(`${apiUrl}/products/${productId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            const meta = getProductMetadata(data.name);
            setProduct({
              ...data,
              name: data.name.normalize("NFC"),
              description: data.description ? data.description.normalize("NFC") : null,
              imageUrl: normalizeStitchImageUrl(data.imageUrl, 1200, 85),
              category: data.category || meta.category,
              tag: data.tag || meta.tag,
              rating: data.rating || meta.rating,
              chips: data.chips || meta.chips,
            });
            setLoading(false);
            return;
          }
        }
      } catch {
        // Fallback to local data
      }

      const localFound = DEFAULT_PRODUCTS.find((p) => p.id === productId);
      if (isMounted) {
        if (localFound) {
          setProduct(localFound);
        } else {
          setProduct(DEFAULT_PRODUCTS[0]);
        }
        setLoading(false);
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleClose = () => {
    router.push("/menu");
  };

  const { addItem } = useCartStore();

  const handleAddToCart = (
    prod: Product,
    customization: CustomizationDetails
  ) => {
    const isBakery = customization.isBakery ?? isBakeryProduct(prod);
    const isHot = customization.temp === "hot";
    addItem({
      id: prod.id,
      name: prod.name,
      price: customization.unitPrice,
      temp: customization.temp,
      temperature: isHot ? "HOT" : "COLD",
      servingStyle: customization.servingStyle,
      isBakery,
      iceLevel: isBakery || isHot ? undefined : customization.ice,
      sugarLevel: isBakery ? undefined : customization.sweetness,
      quantity: customization.quantity,
      size: isBakery ? undefined : customization.size,
      toppings: customization.toppings.map((t) => t.name),
      notes: customization.notes,
      imageUrl: prod.imageUrl,
    });
    router.push("/cart");
  };

  return (
    <div className="min-h-screen bg-[#FEF8F4] flex flex-col font-body">
      <Header activeTab="menu" />

      <main className="flex-1 flex flex-col justify-center items-center py-6 sm:py-10 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-4">
            <div className="w-12 h-12 border-4 border-[#2C1810]/20 border-t-[#2C1810] rounded-full animate-spin" />
            <p className="text-sm font-medium text-[#2C1810]/60 animate-pulse">
              {"Đang tải thông tin hương vị...".normalize("NFC")}
            </p>
          </div>
        ) : product ? (
          <ProductDetailModal
            product={product}
            isOpen={true}
            onClose={handleClose}
            onAddToCart={handleAddToCart}
          />
        ) : (
          <div className="text-center py-16">
            <h2 className="text-xl font-bold text-[#2C1810] mb-2 font-headline">
              {"Không tìm thấy món".normalize("NFC")}
            </h2>
            <p className="text-sm text-[#2C1810]/60 mb-6">
              {"Món đồ uống này hiện không có trong thực đơn hoặc đã dừng phục vụ.".normalize("NFC")}
            </p>
            <button
              onClick={() => router.push("/menu")}
              className="px-6 py-2.5 rounded-full bg-[#2C1810] text-[#FEF8F4] text-xs font-semibold hover:bg-[#845326] transition-colors"
            >
              {"Quay lại Thực đơn".normalize("NFC")}
            </button>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}

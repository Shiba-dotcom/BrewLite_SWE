"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { notFound, useRouter } from "next/navigation";
import BrewLiteLogo from "../../components/BrewLiteLogo";
import Footer from "../../components/Footer";
import ProductDetailModal, {
  CustomizationDetails,
} from "../../components/ProductDetailModal";
import { Product, normalizeStitchImageUrl } from "../page";

// Fallback products with NFC normalized text
const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 1,
    name: "Caramel Macchiato Reserve".normalize("NFC"),
    description:
      "Steamed whole milk marked with rich espresso and house vanilla-bean syrup, topped with artisanal caramel drizzle.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuA_8EBLwt4L_ogs45tFoeX2AschBMIQ_8zY6opY-Eo1aVwHvjo92b6GCbAsFksc6fIQ4iISU3QZEA523zpFBnW20VnhXfqht9V1r6uKbV-Wgo4u45SMg-e59aYqC-6hJT1NPkhN2yznsKQxa-0L2fr56Cpi5lbcNIm_PZiEc_HE9tk-7cjMoEfSd3Ec-wx--HraiLRApcSq3-J9nTz8mOKcZWc6OYrZfdI6lAZWFZ8Xh4C8DzLPdnqgvw",
      1200,
      85
    ),
    basePrice: 55000,
    category: "espresso",
    rating: 4.9,
    tag: "Best Seller",
    chips: { temps: ["Hot", "Iced"], note: "Oat +10k" },
  },
  {
    id: 2,
    name: "Cà Phê Muối (Salt Cream)".normalize("NFC"),
    description:
      "Traditional phin dark roast dripped over sweet condensed milk, crowned with velvety Himalayan sea salt foam.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuD2JHwtuaag4QucnWVi7Y7MUa97Oa25ednCYpE9HesjYisLJPn52FXu4y9UmqEkp6pj9v-hz_NkYrBcaUDUqZutKdNeQfz44YJudhYnGwN2F2QbQJ4Ew4V6ius1rRiBS2jRq4FcC-eo33ZyRyzgz6qNp5c2b__fcruyRFBrDwysBzRjAXAdBBxq5UqYD6ZYpv2mGBba9Vqto-2K5Co7yBLzDx1WJPfJxGR2T0n0Ywh77dzXjUxPPxdmgw",
      1200,
      85
    ),
    basePrice: 48000,
    category: "vietnamese",
    rating: 5.0,
    tag: "House Special",
    chips: { temps: ["Iced"], note: "Must Try" },
  },
  {
    id: 3,
    name: "Classic Cà Phê Sữa Đá".normalize("NFC"),
    description:
      "Bold Vietnamese Robusta slow-drip with creamy condensed milk over cracked ice. Pure morning rocket fuel.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCIZbB44qRVY1pyms6hOvSr9FoI6TNLvTSLrvKivyLo8k7gdRn4qJsmBBo3bGbGlKCEsB8JKZE2_I8ZxbmMjYuk0grsZYxa2ar_y6VY3RRtljQ06oax3w2G9JFc-kSGXM286bXbhzANA_ouqa7FyF3I5WmEOPMSODzvZBS_XK26iw0LuRqi4n9wLTA0rNm7ptRKlDNkhR5nxtCM6nx9o7aPSXMpDjWV22IeQNOOre4wh_HE0i6NzoD_Ig",
      1200,
      85
    ),
    basePrice: 42000,
    category: "vietnamese",
    rating: 4.8,
    tag: "Classic",
    chips: { temps: ["Iced"], note: "Strong 100% Robusta" },
  },
  {
    id: 4,
    name: "Oat Vanilla Flat White".normalize("NFC"),
    description:
      "Double ristretto pulled over silky steamed Minor Figures oat milk with Madagascar vanilla infusion.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCtdVLAuVwn3W30RG7ADA9LppEh84asRJjxxbS8ExVvJ9ePRFhi0xDMPqGcCNR0Xgt4JKw3aqbExtxBy1XnkQIWw9L5cI1T1zMSXxt107TxP2gqhaZ4CdQ9UcHMYTwJl95SKNSII0Khv8LRlqI5MV247TzN6AGA1xwKWT1L_lsra3jdIQvJvp5S3OVk3Fm1dcb4YF8_7WeBmqYWZ-lKdqyrreGxELCBYH9oVVmTUnsXWJrcfjA1k8naHw",
      1200,
      85
    ),
    basePrice: 58000,
    category: "espresso",
    rating: 4.9,
    tag: "Dairy-Free",
    chips: { temps: ["Hot", "Iced"], note: "Minor Figures Oat" },
  },
  {
    id: 5,
    name: "Uji Ceremonial Matcha".normalize("NFC"),
    description:
      "Stone-ground Kyoto matcha whisked to frothy perfection with sweet milk and honey blossom touch.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAiE5Lnsoqr00TOxeH6JbCtiLIMXU53k3x_8dVFtt4DLQoZXZiJt2xGNoH0GatOy9jsGUDKGlrQ5Mgc5FVlK3vnvBUECMo4iv8TNhHguSKQeYkieX3T5CZX31qPygR9_vIPbFPSQRuwO-2ZLbuG1NCPEUot3O9UH8BA9-KUSqcgX6R_OUzMQT5Q76jC6QpGYSLjCdglVawFlWj7_DT_7zFtMHNVAZH094b--RuESwBWmkMEaXRa80wZhA",
      1200,
      85
    ),
    basePrice: 62000,
    category: "tea",
    rating: 4.9,
    tag: "Kyoto Harvest",
    chips: { temps: ["Hot", "Iced"], note: "100% Ceremonial" },
  },
  {
    id: 6,
    name: "Slow Steep Cold Brew Tonic".normalize("NFC"),
    description:
      "20-hour steeped Ethiopian Yirgacheffe paired with craft citrus tonic and fresh rosemary sprig.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBvi7mwkGjo8B2m4ZEOPwf_W1V5kQW9RKL2IAzXEv-SovTKDzVK0OD3esYCJwXSchv_Auh1G6RvQTVeKrCkQY6bRd-fDxl12w3FI6dvckC4PZkQ0E3Gq38alWt9ALwObNXSoFBNdlwZADsNzJR5PAj2uH3QjCkEIBre66qoBJxTD3aoIM4IZ_FqajrFQ6Ul6fQCmW6cvf86krzVrHWzIW6pge0erDsCSdtHCZ7asAbiQ_33atiaWm1LFQ",
      1200,
      85
    ),
    basePrice: 52000,
    category: "coldbrew",
    rating: 4.7,
    tag: "Refreshing",
    chips: { temps: ["Iced"], note: "20-Hour Steep" },
  },
  {
    id: 7,
    name: "Pain au Chocolat Artisanal".normalize("NFC"),
    description:
      "Flaky 72-layer European butter pastry folded with Belgian dark chocolate batons, baked warm hourly.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuBg1Snf5xKAHwsFb3AqGzFsIyAaA6rVyxccMAj32IMZM49P-x3J3U8c5UUydATlynLAV8KkSaPJ0F9UWXYbLTsTgTz8sl8-VBFc_PbXeTgFHeEUGp5i2D_lRhjw7KllS9UmddcRjvmLkRFEsQjjQLqQ2oh-m3miKrt9TZ5t5P5EKq5blQv0spatX_IaiO00YQ6NsYgBn75zcJcigcXh6jiIGtWCAwN5xquUofdDjW2xRW8woBkfpJPbpg",
      1200,
      85
    ),
    basePrice: 38000,
    category: "bakery",
    rating: 4.9,
    tag: "Freshly Baked",
    chips: { temps: ["Warm"], note: "Belgian Dark" },
  },
  {
    id: 8,
    name: "Cinnamon Honey Cruffin".normalize("NFC"),
    description:
      "Hybrid croissant-muffin rolled in Ceylon cinnamon sugar, filled with wild forest honey pastry cream.".normalize("NFC"),
    imageUrl: normalizeStitchImageUrl(
      "https://lh3.googleusercontent.com/aida-public/AB6AXuCMz8IYuZoecp2xaPKI20CiinmOzxoESWdFVpAYHSscIdmg0tH_JPyYS5qcemcSUQfY982Pb_3fEc3Bqw3dZwtfhfne_AlsG6wJm0l4aZaxTu0yCpk9hQ_gkqEfWY_mDl63LJM5hTfq8ev3oHht07uMu2gIKcQ2hsoMHCgmqAOGmLrnwqP37rWNrzd6JYQrHPOLCtjL-Ee5NzysLlJ2bcf4TZ8ajcc9tdFm4bKCfrm0po0PFoQE5dAOMQ",
      1200,
      85
    ),
    basePrice: 42000,
    category: "bakery",
    rating: 4.8,
    tag: "Morning Favorite",
    chips: { temps: ["Warm"], note: "Ceylon Spice" },
  },
];

export default function ProductDetailClient({
  productId,
}: {
  productId: number;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProduct() {
      setLoading(true);
      try {
        const res = await fetch(`http://localhost:3001/products/${productId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setProduct(data);
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
          setProduct(DEFAULT_PRODUCTS[1]); // Default to Cà Phê Muối
        }
        setLoading(false);
      }
    }

    loadProduct();

    return () => {
      isMounted = false;
    };
  }, [productId]);

  const handleAddToCart = (
    item: Product,
    customization: CustomizationDetails
  ) => {
    console.log("Added to cart:", item.name, customization);
    setTimeout(() => {
      router.push("/menu");
    }, 1500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center font-body">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#845326] border-t-transparent rounded-full animate-spin" />
          <span className="text-[13px] text-[#504440] font-semibold">
            {"Đang tải chi tiết đồ uống...".normalize("NFC")}
          </span>
        </div>
      </div>
    );
  }

  if (!product) {
    return notFound();
  }

  return (
    <div className="min-h-screen bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body selection:bg-[#fedcc2] selection:text-[#2c1810]">
      {/* ── HEADER ── */}
      <header className="sticky top-0 z-50 bg-[#FEF8F4]/90 backdrop-blur-md border-b border-[#2C1810]/10 px-4 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between gap-6">
          <div className="flex items-center">
            <Link className="flex items-center" href="/menu">
              <BrewLiteLogo className="h-9 md:h-10 w-auto" />
            </Link>
            <nav className="hidden sm:flex items-center gap-1.5 ml-4">
              <Link
                href="/menu"
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-[#2C1810] text-[#FEF8F4] font-body"
              >
                {"Thực đơn".normalize("NFC")}
              </Link>
              <Link
                href="#"
                className="px-3.5 py-1.5 rounded-full text-xs font-medium text-[#2C1810]/70 hover:text-[#2C1810] hover:bg-[#2C1810]/5 transition-colors font-body"
              >
                {"Đơn hàng".normalize("NFC")}
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D97736]/10 text-[#D97736] border border-[#D97736]/20 text-xs font-semibold whitespace-nowrap font-body">
              <span>{"⭐ 120 điểm".normalize("NFC")}</span>
            </div>

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

      {/* ── PRODUCT DETAIL VIEW ── */}
      <main className="flex-1 w-full bg-[#fef8f4]">
        <ProductDetailModal
          product={product}
          isOpen={true}
          onClose={() => router.push("/menu")}
          onAddToCart={handleAddToCart}
          isModal={false}
        />
      </main>

      {/* ── FOOTER ── */}
      <Footer />
    </div>
  );
}

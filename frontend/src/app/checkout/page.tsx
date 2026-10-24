"use client";

import React, { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Wallet,
  AlertCircle,
  Clock,
  Store,
  Sparkles,
  RefreshCw,
  Lock,
  XCircle,
  Tag,
  Check,
  Leaf,
  Copy,
  CheckCheck,
  QrCode,
  ScanFace,
  CheckCircle2,
  X,
  Snowflake,
  Flame,
  ExternalLink,
  ArrowRight } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiFetch, useAuthStore } from "../store/authStore";
import { useCartStore, isBakeryProduct } from "../store/cartStore";
import { DEFAULT_PRODUCTS } from "../utils/productUtils";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function vnd(n: number) {
  return (n || 0).toLocaleString("vi-VN") + "đ";
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function AttributeBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[#F5EFEB] text-stone-800 border border-[#EAE2D5] text-[10px] md:text-[11px] font-semibold px-2 py-0.5 rounded-full font-body whitespace-nowrap">
      {children}
    </span>
  );
}

function ToppingBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] font-bold text-[10px] md:text-[11px] px-2 py-0.5 rounded-full font-body whitespace-nowrap shadow-2xs">
      {children}
    </span>
  );
}

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
  return val.endsWith("đá") ? val : `${val} đá`;
}

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

function getItemImage(item: { productId?: number; productName: string }): string {
  if (item.productId) {
    const byId = DEFAULT_PRODUCTS.find((p) => p.id === item.productId);
    if (byId?.imageUrl) return byId.imageUrl;
  }

  const nameNorm = (item.productName || "").normalize("NFC").toLowerCase().trim();
  const byName = DEFAULT_PRODUCTS.find(
    (p) => p.name.normalize("NFC").toLowerCase().trim() === nameNorm
  );
  if (byName?.imageUrl) return byName.imageUrl;

  if (nameNorm.includes("pain") || nameNorm.includes("chocolat")) {
    return "/images/products/pain-au-chocolat.png";
  }
  if (nameNorm.includes("cheesecake")) {
    return "/images/products/basque-burnt-cheesecake.png";
  }
  if (nameNorm.includes("tiramisu")) {
    return "/images/products/classic-tiramisu.png";
  }
  if (nameNorm.includes("croissant") || nameNorm.includes("cruffin")) {
    return "/images/products/pain-au-chocolat.png";
  }
  if (nameNorm.includes("muối") || nameNorm.includes("muoi")) {
    return "/images/products/ca-phe-muoi.png";
  }
  if (nameNorm.includes("sữa") || nameNorm.includes("sua")) {
    return "/images/products/ca-phe-sua.png";
  }
  if (nameNorm.includes("bạc xỉu") || nameNorm.includes("bac xiu")) {
    return "/images/products/ca-phe-bac-xiu.png";
  }
  if (nameNorm.includes("đen") || nameNorm.includes("den")) {
    return "/images/products/ca-phe-den.png";
  }
  if (nameNorm.includes("macchiato")) {
    return "/images/products/iced-caramel-macchiato.png";
  }
  if (nameNorm.includes("matcha")) {
    return "/images/products/matcha-latte.png";
  }
  if (nameNorm.includes("trà đào") || nameNorm.includes("cam sả")) {
    return "/images/products/tra-dao-cam-sa.png";
  }

  return FALLBACK_DRINK_IMG;
}

// Biểu tượng Apple Pay chính thức (Logo Quả Táo + PAY liền khối chuẩn FontAwesome, tối ưu viewBox tỉ lệ vàng)
function ApplePayLogo({ className = "h-5 w-auto fill-current inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 115 640 275" fill="currentColor" aria-label="Apple Pay">
      <path d="M116.9 158.5c-7.5 8.9-19.5 15.9-31.5 14.9c-1.5-12 4.4-24.8 11.3-32.6c7.5-9.1 20.6-15.6 31.3-16.1c1.2 12.4-3.7 24.7-11.1 33.8m10.9 17.2c-17.4-1-32.3 9.9-40.5 9.9c-8.4 0-21-9.4-34.8-9.1c-17.9.3-34.5 10.4-43.6 26.5c-18.8 32.3-4.9 80 13.3 106.3c8.9 13 19.5 27.3 33.5 26.8c13.3-.5 18.5-8.6 34.5-8.6c16.1 0 20.8 8.6 34.8 8.4c14.5-.3 23.6-13 32.5-26c10.1-14.8 14.3-29.1 14.5-29.9c-.3-.3-28-10.9-28.3-42.9c-.3-26.8 21.9-39.5 22.9-40.3c-12.5-18.6-32-20.6-38.8-21.1m100.4-36.2v194.9h30.3v-66.6h41.9c38.3 0 65.1-26.3 65.1-64.3s-26.4-64-64.1-64zm30.3 25.5h34.9c26.3 0 41.3 14 41.3 38.6s-15 38.8-41.4 38.8h-34.8zm162.2 170.9c19 0 36.6-9.6 44.6-24.9h.6v23.4h28v-97c0-28.1-22.5-46.3-57.1-46.3c-32.1 0-55.9 18.4-56.8 43.6h27.3c2.3-12 13.4-19.9 28.6-19.9c18.5 0 28.9 8.6 28.9 24.5v10.8l-37.8 2.3c-35.1 2.1-54.1 16.5-54.1 41.5c.1 25.2 19.7 42 47.8 42m8.2-23.1c-16.1 0-26.4-7.8-26.4-19.6c0-12.3 9.9-19.4 28.8-20.5l33.6-2.1v11c0 18.2-15.5 31.2-36 31.2m102.5 74.6c29.5 0 43.4-11.3 55.5-45.4L640 193h-30.8l-35.6 115.1h-.6L537.4 193h-31.6L557 334.9l-2.8 8.6c-4.6 14.6-12.1 20.3-25.5 20.3c-2.4 0-7-.3-8.9-.5v23.4c1.8.4 9.3.7 11.6.7" />
    </svg>
  );
}

// Biểu tượng Quả Táo Apple chuẩn FontAwesome (chiếc lá căn giữa ngay trên rãnh trung tâm của thân quả táo)
function AppleLogo({ className = "h-4 w-auto fill-current inline-block" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 384 512" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

const FALLBACK_DRINK_IMG = "/images/products/ca-phe-sua.png";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
  unitPrice: number;
}

interface OrderDetail {
  id: number;
  status: "PENDING" | "PAID" | "PREPARING" | "READY" | "COMPLETED" | "PAYMENT_FAILED" | "CANCELLED";
  totalAmount: number;
  discountCode?: string | null;
  discountAmount?: number;
  createdAt: string;
  items: OrderItem[];
}

type SelectedPaymentType = "EWALLET" | "BANK_CARD" | "APPLE_PAY";

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdParam = searchParams.get("orderId");
  const isCanceled = searchParams.get("canceled") === "true";
  const parsedOrderId = orderIdParam ? parseInt(orderIdParam, 10) : null;

  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const { clearCart } = useCartStore();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderFetchError, setOrderFetchError] = useState<string | null>(null);
  const [customizationsMap, setCustomizationsMap] = useState<
    Record<
      string,
      {
        temp?: string;
        temperature?: "HOT" | "COLD";
        iceLevel?: string;
        sugarLevel?: string;
        servingStyle?: string;
        isBakery?: boolean;
        toppings?: string[];
        notes?: string;
      }
    >
  >({});

  useEffect(() => {
    if (!order?.id || typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`order_customizations_${order.id}`);
      if (stored) {
        const list = JSON.parse(stored);
        if (Array.isArray(list)) {
          const map: Record<string, any> = {};
          list.forEach((entry, idx) => {
            map[`idx_${idx}`] = entry;
            if (entry.productId) {
              map[`prod_${entry.productId}`] = entry;
            }
          });
          setCustomizationsMap(map);
        }
      }
    } catch {
      // ignore
    }
  }, [order?.id]);

  // Form State
  const [selectedMethod, setSelectedMethod] = useState<SelectedPaymentType>("EWALLET");
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Cổng thanh toán ZaloPay Sandbox (Bên thứ ba VNG)
  const [ewalletProvider, setEwalletProvider] = useState<"ZALOPAY" | "VIETQR">("ZALOPAY");
  const [zaloPayLoading, setZaloPayLoading] = useState(false);
  const [zaloPayData, setZaloPayData] = useState<{
    orderUrl?: string;
    zpTransToken?: string;
    appTransId?: string;
  } | null>(null);

  // Form Thẻ Tín Dụng / Ghi Nợ (Mock Stripe Element)
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [cardExpiry, setCardExpiry] = useState("12/28");
  const [cardCvc, setCardCvc] = useState("888");
  const [cardName, setCardName] = useState("BREWLITE GUEST");

  // State Giả Lập Sinh Trắc Học (Mock Apple Pay & Google Wallet Face ID)
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricType, setBiometricType] = useState<"APPLE_PAY" | "GOOGLE_PAY">("APPLE_PAY");
  const [biometricState, setBiometricState] = useState<"READY" | "SCANNING" | "SUCCESS" | "FAILED">("READY");

  // Tự động nhận diện loại thẻ dựa trên tiền tố số thẻ
  const cardBrand = useMemo(() => {
    const raw = cardNumber.replace(/\s/g, "");
    if (raw.startsWith("4")) return "visa";
    if (raw.startsWith("5")) return "mastercard";
    if (raw.startsWith("9704")) return "napas";
    return "card";
  }, [cardNumber]);

  // Sao chép nhanh vào clipboard
  const handleCopy = (text: string, fieldName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  // Tự động kết nối máy chủ ZaloPay Sandbox khi khách hàng chọn ZaloPay
  useEffect(() => {
    let active = true;
    const initZaloPay = async () => {
      if (!order?.id || selectedMethod !== "EWALLET" || ewalletProvider !== "ZALOPAY") return;
      if (zaloPayData?.appTransId) return;

      setZaloPayLoading(true);
      try {
        const res = await apiFetch("/payments/zalopay/create", {
          method: "POST",
          body: JSON.stringify({ orderId: order.id }),
        });
        const data = await res.json().catch(() => ({}));
        if (active && (data.returnCode === 1 || data.orderUrl)) {
          setZaloPayData({
            orderUrl: data.orderUrl,
            zpTransToken: data.zpTransToken,
            appTransId: data.appTransId,
          });
        }
      } catch (err) {
        console.warn("Lỗi tạo đơn ZaloPay sandbox:", err);
      } finally {
        if (active) setZaloPayLoading(false);
      }
    };

    initZaloPay();
    return () => {
      active = false;
    };
  }, [order?.id, selectedMethod, ewalletProvider, zaloPayData?.appTransId]);

  // Polling tự động mỗi 3 giây tra cứu trạng thái thanh toán từ máy chủ ZaloPay
  useEffect(() => {
    if (!zaloPayData?.appTransId || !order?.id || selectedMethod !== "EWALLET" || ewalletProvider !== "ZALOPAY") return;
    if (order.status === "PAID" || order.status === "CANCELLED") return;

    const interval = setInterval(async () => {
      try {
        const res = await apiFetch(`/payments/zalopay/status/${order.id}?appTransId=${zaloPayData.appTransId}`);
        const data = await res.json().catch(() => ({}));
        if (data.isPaid) {
          clearInterval(interval);
          clearCart();
          if (typeof window !== "undefined") {
            sessionStorage.removeItem("brewlite_active_pending_order");
          }
          router.push(`/order-confirmation?orderId=${order.id}`);
        }
      } catch {
        // bỏ qua lỗi gián đoạn mạng khi polling
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [zaloPayData?.appTransId, order?.id, order?.status, selectedMethod, ewalletProvider, clearCart, router]);


  // Tự động sinh Idempotency Key mới
  const regenerateIdempotencyKey = () => {
    const newKey =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `key-${Date.now()}`;
    setIdempotencyKey(newKey);
    return newKey;
  };

  // Khởi tạo key khi mount
  useEffect(() => {
    regenerateIdempotencyKey();
  }, []);

  // Kiểm tra đăng nhập
  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) {
      router.push(`/login?redirect=/checkout?orderId=${orderIdParam || ""}`);
    }
  }, [_hasHydrated, isAuthenticated, orderIdParam, router]);

  // Tải chi tiết đơn hàng GET /orders/:id
  useEffect(() => {
    if (!parsedOrderId) {
      setLoadingOrder(false);
      setOrderFetchError("Không tìm thấy mã đơn hàng hợp lệ trên đường dẫn.".normalize("NFC"));
      return;
    }

    const fetchOrder = async () => {
      setLoadingOrder(true);
      setOrderFetchError(null);
      try {
        const res = await apiFetch(`/orders/${parsedOrderId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.message || `Lỗi tải đơn hàng (${res.status})`);
        }
        const data: OrderDetail = await res.json();
        setOrder(data);

        // Nếu đơn đã thanh toán rồi, chuyển hướng sang confirmation
        if (
          data.status === "PAID" ||
          data.status === "COMPLETED" ||
          data.status === "READY" ||
          data.status === "PREPARING"
        ) {
          router.replace(`/order-confirmation?orderId=${data.id}`);
        }
      } catch (err: unknown) {
        setOrderFetchError(
          err instanceof Error ? err.message : "Không thể tải thông tin đơn hàng."
        );
      } finally {
        setLoadingOrder(false);
      }
    };

    fetchOrder();
  }, [parsedOrderId, router]);

  // ── Đếm ngược 5 phút tự động hủy đơn và hoàn trả kho ──
  const [checkoutRemaining, setCheckoutRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!order || order.status !== "PENDING") {
      setCheckoutRemaining(null);
      return;
    }

    const calcRem = () => {
      const expireTime = new Date(order.createdAt).getTime() + 5 * 60 * 1000;
      return Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
    };

    setCheckoutRemaining(calcRem());

    const timer = setInterval(() => {
      const rem = calcRem();
      setCheckoutRemaining(rem);
      if (rem <= 0) {
        clearInterval(timer);
        if (parsedOrderId) {
          apiFetch(`/orders/${parsedOrderId}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
              if (d) setOrder(d);
            })
            .catch(() => {});
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [order, parsedOrderId]);

  // Xử lý gửi thanh toán thực tế POST /payments tới Backend
  const executeBackendPayment = async (overrideMethod?: SelectedPaymentType) => {
    if (!order) return;

    setIsProcessing(true);
    setErrorMessage(null);

    const currentKey = idempotencyKey || regenerateIdempotencyKey();
    const effectiveMethod = overrideMethod || selectedMethod;
    const backendMethod =
      effectiveMethod === "BANK_CARD" || effectiveMethod === "APPLE_PAY"
        ? "BANK_CARD"
        : "EWALLET";

    try {
      const res = await apiFetch("/payments", {
        method: "POST",
        headers: {
          "Idempotency-Key": currentKey,
        },
        body: JSON.stringify({
          orderId: order.id,
          method: backendMethod,
          simulateFailure,
        }),
      });

      const result = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(result?.message || `Lỗi thanh toán từ hệ thống (${res.status})`);
      }

      if (result.success) {
        // CHỈ XÓA GIỎ HÀNG KHI THANH TOÁN THÀNH CÔNG (Yêu cầu 6)
        clearCart();
        if (typeof window !== "undefined") {
          sessionStorage.removeItem("brewlite_active_pending_order");
        }
        router.push(`/order-confirmation?orderId=${order.id}`);
      } else {
        setErrorMessage(
          result.message ||
            "Giao dịch thanh toán bị từ chối bởi ngân hàng/ví điện tử. Vui lòng kiểm tra lại tài khoản hoặc thử phương thức khác.".normalize(
              "NFC"
            )
        );
        setOrder((prev) => (prev ? { ...prev, status: "PAYMENT_FAILED" } : null));
        regenerateIdempotencyKey();
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Đã xảy ra lỗi trong quá trình xử lý giao dịch."
      );
      regenerateIdempotencyKey();
    } finally {
      setIsProcessing(false);
    }
  };

  // Giả lập quét 1-chạm Face ID / Touch ID cho Apple Pay & Google Wallet
  const triggerBiometric = (type: "APPLE_PAY" | "GOOGLE_PAY") => {
    setBiometricType(type);
    setShowBiometricModal(true);
    setBiometricState("SCANNING");

    // Giả lập quét sinh trắc học mượt mà trong 1.5 giây
    setTimeout(async () => {
      if (simulateFailure) {
        setBiometricState("FAILED");
        setTimeout(() => {
          setShowBiometricModal(false);
          setErrorMessage(
            "Xác thực sinh trắc học bị từ chối hoặc giao dịch không thành công (Demo Mode).".normalize(
              "NFC"
            )
          );
          setOrder((prev) => (prev ? { ...prev, status: "PAYMENT_FAILED" } : null));
          regenerateIdempotencyKey();
        }, 1200);
      } else {
        setBiometricState("SUCCESS");
        setTimeout(async () => {
          setShowBiometricModal(false);
          await executeBackendPayment("APPLE_PAY");
        }, 700);
      }
    }, 1500);
  };

  // Nút Hành Động Thanh Toán Chính
  const handlePayment = async () => {
    if (!order) return;

    if (order.status === "CANCELLED" || (checkoutRemaining !== null && checkoutRemaining <= 0)) {
      setErrorMessage(
        "Đơn hàng này đã hết hạn thanh toán (quá 5 phút) và nguyên liệu đã được hoàn trả về kho. Vui lòng quay lại Giỏ hàng để tạo đơn mới."
      );
      return;
    }

        // Nếu là Ví ZaloPay: Chuyển hướng sang Cổng ZaloPay Gateway độc lập
    if (selectedMethod === "EWALLET" && ewalletProvider === "ZALOPAY") {
      router.push(
        `/gateway/zalopay?orderId=${order.id}&amount=${order.totalAmount}&appTransId=${encodeURIComponent(
          zaloPayData?.appTransId || ""
        )}&token=${encodeURIComponent(zaloPayData?.zpTransToken || "")}`
      );
      return;
    }

    // Nếu là Apple Pay & Google Wallet: Kích hoạt flow 1-chạm Face ID
    if (selectedMethod === "APPLE_PAY") {
      triggerBiometric("APPLE_PAY");
      return;
    }

    // Nếu là Thẻ Ngân Hàng: Kiểm tra tính hợp lệ cơ bản
    if (selectedMethod === "BANK_CARD") {
      const cleanCard = cardNumber.replace(/\s/g, "");
      if (cleanCard.length < 16) {
        setErrorMessage("Vui lòng nhập đầy đủ 16 chữ số trên thẻ tín dụng / ghi nợ của bạn.".normalize("NFC"));
        return;
      }
    }

    await executeBackendPayment();
  };

  // Tính toán số liệu phân tách chi phí đồng bộ 100% với Giỏ hàng (Cart)
  const totalItemCount = useMemo(() => {
    if (!order?.items) return 0;
    return order.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [order]);

  const subtotal = useMemo(() => {
    if (!order?.items || order.items.length === 0) return order?.totalAmount || 0;
    return order.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  }, [order]);

  const discountAmount = order?.discountAmount ?? 0;
  const discountCode = order?.discountCode ?? null;
  const afterDiscount = Math.max(0, subtotal - discountAmount);
  // Thuế VAT 8% áp dụng vào giá tạm tính
  const vat = Math.floor(afterDiscount * 0.08);
  // Làm tròn xuống hàng nghìn VNĐ (ví dụ 144.720đ -> 144.000đ)
  const totalAmount = order?.totalAmount ?? (Math.floor((afterDiscount + vat) / 1000) * 1000);
  const loyaltyPoints = Math.floor(totalAmount / 1000);

  const getProductImage = (productId: number) => {
    const found = DEFAULT_PRODUCTS.find((p) => p.id === productId);
    return found?.imageUrl || FALLBACK_DRINK_IMG;
  };

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#1D1B19] flex flex-col font-body selection:bg-[#FEDCC2] selection:text-[#2C1810]">
      {/* Header chính của website */}
      <Header cartCount={0} activeTab="menu" />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* ── Sub-header: Breadcrumb & Stepper Căn Chỉnh Thẳng Hàng Chuẩn Tuyệt Đối ── */}
        <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-[#EBE4D8]">
          {/* Nút quay lại giỏ hàng: Căn thẳng hàng với thanh Stepper qua h-9 và items-center */}
          <Link
            href="/cart"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#654E44] hover:text-[#1A120B] transition-colors group h-9"
          >
            <ArrowLeft
              size={16}
              strokeWidth={2.2}
              className="transition-transform group-hover:-translate-x-0.5 shrink-0"
            />
            <span className="leading-none">{"Quay lại Giỏ hàng".normalize("NFC")}</span>
          </Link>

          {/* Stepper chuẩn Design System: Capsule h-9 bo tròn rounded-full bg-[#EFE8DD] */}
          <div className="inline-flex items-center gap-1.5 bg-[#EFE8DD] p-1 rounded-full text-xs font-serif text-[#654E44] h-9">
            {/* Bước 1 */}
            <Link
              href="/menu"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:text-[#1A120B] transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-[#DFD6C9] flex items-center justify-center shrink-0">
                <span className="font-sans text-[11px] font-bold leading-none -translate-y-[0.5px] text-[#654E44]">
                  1
                </span>
              </span>
              <span className="font-serif text-xs leading-none">{"Chọn món".normalize("NFC")}</span>
            </Link>

            <span className="text-[#C8BEB0] text-xs leading-none select-none">/</span>

            {/* Bước 2 */}
            <Link
              href="/cart"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full hover:text-[#1A120B] transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-[#DFD6C9] flex items-center justify-center shrink-0">
                <span className="font-sans text-[11px] font-bold leading-none -translate-y-[0.5px] text-[#654E44]">
                  2
                </span>
              </span>
              <span className="font-serif text-xs leading-none">{"Giỏ hàng".normalize("NFC")}</span>
            </Link>

            <span className="text-[#C8BEB0] text-xs leading-none select-none">/</span>

            {/* Bước 3 (Active: Pill màu cam đào/peach ấm bg-[#FBDBC6] có vòng tròn đen số 3) */}
            <div className="bg-[#FBDBC6] text-[#2C1810] pl-1.5 pr-3 rounded-full inline-flex items-center gap-1.5 font-medium shadow-2xs h-7">
              <span className="w-5 h-5 rounded-full bg-[#1C130D] text-white flex items-center justify-center shrink-0">
                <span className="font-sans text-[11px] font-bold leading-none -translate-y-[0.5px] text-white">
                  3
                </span>
              </span>
              <span className="font-serif text-xs leading-none font-semibold">
                {"Thanh toán".normalize("NFC")}
              </span>
            </div>
          </div>
        </div>

        {/* ── Trạng thái Loading ── */}
        {loadingOrder && (
          <div className="bg-white rounded-3xl border border-[#EDE7DE] shadow-sm p-16 text-center flex flex-col items-center justify-center gap-4 my-8">
            <div className="w-10 h-10 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
            <p className="text-stone-500 text-sm font-medium">
              {"Đang tải thông tin đơn hàng và biểu phí...".normalize("NFC")}
            </p>
          </div>
        )}

        {/* ── Trạng thái Lỗi Tải Đơn Hàng ── */}
        {!loadingOrder && orderFetchError && (
          <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-10 text-center max-w-md mx-auto my-12 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center">
              <XCircle size={30} />
            </div>
            <div>
              <h2 className="font-serif font-bold text-xl text-stone-900 mb-1">
                {"Không tìm thấy đơn hàng".normalize("NFC")}
              </h2>
              <p className="text-stone-500 text-xs md:text-sm leading-relaxed">
                {orderFetchError}
              </p>
            </div>
            <Link
              href="/menu"
              className="px-6 py-2.5 bg-[#1A120B] text-white rounded-full text-xs font-bold hover:bg-black transition active:scale-95"
            >
              {"Về lại Thực đơn".normalize("NFC")}
            </Link>
          </div>
        )}

        {/* ── Banner đếm ngược 5 phút tự hủy đơn và hoàn kho ── */}
        {!loadingOrder && order && order.status === "PENDING" && checkoutRemaining !== null && (
          <div
            className={`mb-6 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-all ${
              checkoutRemaining <= 60
                ? "bg-red-50 border border-red-200 text-red-950 animate-pulse"
                : "bg-amber-50/90 border border-amber-200 text-amber-950"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  checkoutRemaining <= 60
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                <span className="material-symbols-outlined text-xl">
                  {checkoutRemaining <= 60 ? "alarm" : "timer"}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold">
                  {checkoutRemaining > 0
                    ? "Đang giữ chỗ nguyên liệu tại quầy Barista (5 phút)"
                    : "Đơn hàng đã hết hạn thanh toán (quá 5 phút)"}
                </p>
                <p className="text-xs opacity-80 mt-0.5">
                  {checkoutRemaining > 0
                    ? `Vui lòng hoàn tất thanh toán trước khi hết giờ. Nếu quá 5 phút, hệ thống sẽ tự động hủy đơn #${order.id} và hoàn trả nguyên liệu về kho.`
                    : "Toàn bộ nguyên liệu đã được tự động hoàn trả về kho. Vui lòng quay lại tạo đơn mới."}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              {checkoutRemaining > 0 ? (
                <div
                  className={`font-mono text-base font-extrabold px-4 py-2 rounded-xl border tracking-wider ${
                    checkoutRemaining <= 60
                      ? "bg-red-100 text-red-700 border-red-300"
                      : "bg-amber-100 text-amber-900 border-amber-300"
                  }`}
                >
                  {String(Math.floor(checkoutRemaining / 60)).padStart(2, "0")}:
                  {String(checkoutRemaining % 60).padStart(2, "0")}
                </div>
              ) : (
                <Link
                  href="/cart"
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-all shadow-xs"
                >
                  Quay lại Giỏ hàng
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Thông báo nếu đơn đã bị CANCELLED ── */}
        {!loadingOrder && order && order.status === "CANCELLED" && (
          <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 p-5 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-700">
                <span className="material-symbols-outlined text-xl">cancel</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-red-900">
                  Đơn hàng #BL-{order.id} đã bị hủy hoặc hết hạn thanh toán
                </h3>
                <p className="text-xs text-red-700/80 mt-0.5">
                  Toàn bộ nguyên liệu đã được hoàn trả về kho Barista. Không thể tiếp tục thanh toán cho đơn này.
                </p>
              </div>
            </div>
            <Link
              href="/cart"
              className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs shrink-0 transition-all shadow-xs"
            >
              Quay lại Giỏ hàng
            </Link>
          </div>
        )}

        {/* ── Hai Cột Chính: Bám Sát Bản Thiết Kế Google Stitch ── */}
        {!loadingOrder && order && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* ════════════════════════════════════════════════════════════════════
                CỘT TRÁI (~41%): TÓM TẮT ĐƠN HÀNG (ORDER SUMMARY)
               ════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EDE7DE] shadow-sm p-6 md:p-7 flex flex-col gap-5">
              {/* 1. Header khối Tóm tắt đơn hàng - Font Serif chuẩn cổ điển */}
              <div className="flex items-start justify-between gap-3 border-b border-[#F2ECE4] pb-4">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-[#A47148] uppercase">
                    {"CHI TIẾT ĐƠN HÀNG".normalize("NFC")}
                  </p>
                  <h2 className="text-2xl font-bold font-serif text-[#1A120B] mt-0.5 tracking-normal">
                    {"Tóm tắt đơn hàng".normalize("NFC")}
                  </h2>
                </div>
                <span className="font-mono text-xs font-bold px-3 py-1 bg-[#F5EFEB] text-stone-700 rounded-full border border-stone-200 shrink-0">
                  {`#BL-${order.id}`}
                </span>
              </div>

              {/* 2. Khối thông tin địa điểm nhận hàng (Pickup Location Card) */}
              <div className="bg-[#F7F3EE] rounded-2xl p-3.5 flex flex-col gap-1.5 border border-[#EDE6DC]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-[#EAE2D5] flex items-center justify-center text-[#845326] shrink-0">
                    <Store size={14} strokeWidth={2} />
                  </div>
                  <h3 className="font-bold text-xs md:text-sm text-[#1A120B]">
                    {"Downtown Roastery Bar, Q.1".normalize("NFC")}
                  </h3>
                </div>
                <p className="text-[11px] text-stone-500 pl-8">
                  {"Kệ Express Bar số 04 • Nhận tại quầy".normalize("NFC")}
                </p>
                {/* Đã sửa màu chấm hổ phách/caramel ấm hòa hợp tự nhiên */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#8C6D46] font-medium pl-8 pt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#B47B48]" />
                  <span>{"Chuẩn bị trong ~5 phút sau khi thanh toán".normalize("NFC")}</span>
                </div>
              </div>

              {/* 3. Danh sách món trong đơn hàng: Bo bọc container theo chuẩn Google Stitch */}
              <div className="bg-[#F7F3EE] rounded-2xl p-3 border border-[#EDE6DC] flex flex-col gap-2.5 max-h-[380px] overflow-y-auto">
                {order.items?.map((item, idx) => {
                  const customization =
                    customizationsMap[`idx_${idx}`] ||
                    customizationsMap[`prod_${item.productId}`];

                  const isBakery =
                    customization?.isBakery ??
                    isBakeryProduct({ name: item.productName });

                  const isHot =
                    customization?.temperature === "HOT" ||
                    customization?.temp?.toLowerCase() === "hot" ||
                    item.productName.toLowerCase().includes("hot") ||
                    item.productName.toLowerCase().includes("nóng");

                  const isWarm =
                    customization?.servingStyle === "Hâm nóng" ||
                    customization?.servingStyle === "Hâm nóng giòn" ||
                    (!customization?.servingStyle && isHot);

                  const iceLevel =
                    isHot || isBakery
                      ? undefined
                      : customization?.iceLevel || "100% đá";

                  const sugarLevel = isBakery
                    ? undefined
                    : customization?.sugarLevel || "100% đường";

                  const effectiveToppings =
                    item.toppings && item.toppings.length > 0
                      ? item.toppings
                      : customization?.toppings && customization.toppings.length > 0
                      ? customization.toppings
                      : [];

                  return (
                    <div
                      key={item.id || idx}
                      className="bg-white rounded-xl p-3 border border-[#EDE7DE] shadow-2xs flex items-start gap-3 transition-colors hover:border-[#E0D7CC]"
                    >
                      {/* Thumbnail món */}
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-xl overflow-hidden bg-[#EDE7E3] shrink-0 border border-stone-100 mt-0.5">
                        <Image
                          src={getItemImage(item)}
                          alt={item.productName}
                          fill
                          unoptimized
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>

                      {/* Chi tiết tên, tùy chọn, toppings, ghi chú */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                        {/* Hàng trên: Tên món + Thành tiền */}
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-xs md:text-sm text-[#1A120B] leading-snug">
                            {item.productName}
                          </h4>
                          <span className="font-sans font-bold text-xs md:text-sm text-[#1A120B] shrink-0 tabular-nums">
                            {vnd(item.unitPrice * item.quantity)}
                          </span>
                        </div>

                        {/* Dòng 1: Tùy chọn cơ bản (Kích thước, Nhiệt độ, Đá, Đường hoặc Phục vụ bánh) */}
                        <div className="flex flex-wrap items-center gap-1">
                          {isBakery ? (
                            <>
                              {isWarm ? (
                                <AttributeBadge>
                                  <Flame size={11} className="text-stone-900" strokeWidth={2.2} />
                                  <span>{"Hâm nóng".normalize("NFC")}</span>
                                </AttributeBadge>
                              ) : (
                                <AttributeBadge>
                                  <Snowflake size={11} className="text-stone-900" strokeWidth={2.2} />
                                  <span>{"Dùng ngay".normalize("NFC")}</span>
                                </AttributeBadge>
                              )}
                            </>
                          ) : (
                            <>
                              <AttributeBadge>Size {item.size || "M"}</AttributeBadge>
                              {isHot ? (
                                <AttributeBadge>
                                  <Flame size={11} className="text-stone-900" strokeWidth={2.2} />
                                  <span>{"Uống Nóng".normalize("NFC")}</span>
                                </AttributeBadge>
                              ) : (
                                <AttributeBadge>
                                  <Snowflake size={11} className="text-stone-900" strokeWidth={2.2} />
                                  <span>{"Uống Lạnh".normalize("NFC")}</span>
                                </AttributeBadge>
                              )}
                              {!isHot && (
                                <AttributeBadge>
                                  <span>{formatIceLevel(iceLevel)}</span>
                                </AttributeBadge>
                              )}
                              <AttributeBadge>
                                <span>{formatSugarLevel(sugarLevel)}</span>
                              </AttributeBadge>
                            </>
                          )}
                        </div>

                        {/* Dòng 2: Topping / Món ăn kèm (Cứ 2 topping xuống 1 dòng) */}
                        {effectiveToppings.length > 0 && (
                          <div className="flex flex-col gap-1 pt-0.5">
                            {chunkArray(effectiveToppings, 2).map((pair, pIdx) => (
                              <div key={pIdx} className="flex flex-wrap items-center gap-1">
                                {pair.map((t) => (
                                  <ToppingBadge key={t}>
                                    <span className="text-[10px] font-extrabold">+</span>
                                    <span>{t}</span>
                                  </ToppingBadge>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Dòng 3: Ghi chú nếu có */}
                        {customization?.notes && (
                          <p className="text-[11px] text-[#827470] italic pt-0.5 leading-tight">
                            <span className="not-italic font-semibold text-[#504440]">
                              {"Ghi chú:".normalize("NFC")}
                            </span>{" "}
                            {customization.notes}
                          </p>
                        )}

                        {/* Dòng 4: Số lượng badge */}
                        <div className="pt-0.5">
                          <span className="inline-block text-[10px] font-bold text-stone-600 bg-[#F5EFEB] px-2 py-0.5 rounded">
                            {`SL: ${String(item.quantity).padStart(2, "0")} ${isBakery ? "phần" : "ly"}`}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 4. Khối mã giảm giá (Voucher Card) - Chỉ hiển thị khi có mã giảm giá thực tế */}
              {discountAmount > 0 && (
                <div className="bg-[#FAF6F0] border border-[#EFE8DD] rounded-xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-[#F5EFEB] flex items-center justify-center text-[#845326] shrink-0">
                      <Tag size={13} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs text-[#1A120B] truncate">
                        {`Ưu đãi: ${discountCode || "Giảm giá"}`.normalize("NFC")}
                      </p>
                      <p className="text-[10px] text-stone-500 truncate">
                        {"Ưu đãi đã được áp dụng vào đơn hàng".normalize("NFC")}
                      </p>
                    </div>
                  </div>
                  <span className="bg-[#EFE9E0] text-[#654E44] text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0">
                    {"Đã áp dụng".normalize("NFC")}
                  </span>
                </div>
              )}

              {/* 5. Tóm tắt thanh toán - Đồng bộ 100% với Giỏ hàng */}
              <div className="flex flex-col gap-2.5 pt-3 border-t border-[#F2ECE4] text-xs font-body">
                <div className="flex items-center justify-between pb-1">
                  <span className="font-headline text-[13px] font-bold text-[#1d1b19]">
                    {"Tóm tắt thanh toán".normalize("NFC")}
                  </span>
                </div>

                {/* Tạm tính */}
                <div className="flex justify-between text-stone-600">
                  <span>
                    {`Tạm tính (${totalItemCount} món)`.normalize("NFC")}
                  </span>
                  <span className="font-sans font-semibold text-stone-900 tabular-nums">
                    {vnd(subtotal)}
                  </span>
                </div>

                {/* Khuyến mãi */}
                {discountAmount > 0 && (
                  <div className="flex justify-between text-[#B45309] font-semibold">
                    <span className="flex items-center gap-1.5 leading-none">
                      <span className="leading-none">{"Khuyến mãi".normalize("NFC")}</span>
                      {discountCode && (
                        <span className="inline-flex items-center justify-center text-[10px] bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded font-mono font-bold leading-none border border-[#fde68a]">
                          {discountCode}
                        </span>
                      )}
                    </span>
                    <span className="font-sans font-bold tabular-nums">
                      -{vnd(discountAmount)}
                    </span>
                  </div>
                )}

                {/* Phí ly & đóng gói Eco */}
                <div className="flex justify-between text-stone-600">
                  <span>{"Phí ly & đóng gói Eco".normalize("NFC")}</span>
                  <span className="text-[#2c1810] font-semibold">
                    {"0đ (Miễn phí)".normalize("NFC")}
                  </span>
                </div>

                {/* Thuế VAT (8%) */}
                <div className="flex justify-between text-stone-600">
                  <span>{"Thuế VAT (8%)".normalize("NFC")}</span>
                  <span className="text-stone-700 font-medium tabular-nums">{vnd(vat)}</span>
                </div>

                {/* Tích luỹ hạt thưởng */}
                <div className="flex justify-between items-center pt-1 border-t border-dashed border-[#EAE2D5]">
                  <span className="text-stone-600">{"Tích luỹ hạt thưởng".normalize("NFC")}</span>
                  <span className="inline-flex items-center gap-1.5 text-[#b45309] font-bold text-[12px]">
                    <Sparkles size={13} className="text-amber-500 fill-amber-400" />
                    <span>+{loyaltyPoints} {"Hạt Vàng".normalize("NFC")}</span>
                  </span>
                </div>
              </div>

              {/* 6. Khối Tổng thanh toán nổi bật: bg-[#F5EDE2] font-sans cho số tiền */}
              <div className="bg-[#F5EDE2] rounded-2xl p-4 md:p-5 flex flex-col gap-2 border border-[#EBE1D3]">
                <div className="flex items-baseline justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-stone-700 uppercase tracking-wide block">
                        {"Tổng thanh toán:".normalize("NFC")}
                      </span>
                      <span className="text-[11px] text-stone-500 font-normal">
                        {"(đã làm tròn)".normalize("NFC")}
                      </span>
                    </div>
                  </div>
                  <span className="font-sans text-2xl md:text-3xl font-bold text-[#1A120B] tabular-nums tracking-tight">
                    {vnd(totalAmount)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-[#845326] font-semibold pt-1 border-t border-[#E5DACB]">
                  <Sparkles size={13} className="text-[#845326] shrink-0" />
                  <span>
                    {`Tích lũy ngay +${loyaltyPoints} Hạt Vàng vào tài khoản BrewLite`.normalize(
                      "NFC"
                    )}
                  </span>
                </div>
              </div>

              {/* 7. Dòng trích dẫn chân cột trái */}
              <p className="text-center text-[11px] text-stone-400 italic pt-1 border-t border-[#F2ECE4]">
                {"Nghệ thuật rang mộc nguyên chất • Không tiền mặt".normalize("NFC")}
              </p>
            </div>

            {/* ════════════════════════════════════════════════════════════════════
                CỘT PHẢI (~59%): PHƯƠNG THỨC THANH TOÁN (PAYMENT METHODS)
               ════════════════════════════════════════════════════════════════════ */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EDE7DE] shadow-sm p-6 md:p-8 flex flex-col gap-6">
              {/* 1. Header khối Phương thức thanh toán - Font Serif */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F2ECE4] pb-4">
                <div>
                  <p className="text-[11px] font-bold tracking-wider text-[#A47148] uppercase">
                    {"BƯỚC 3 / HOÀN TẤT".normalize("NFC")}
                  </p>
                  <h1 className="text-2xl md:text-3xl font-bold font-serif text-[#1A120B] mt-0.5 tracking-normal">
                    {"Phương thức thanh toán".normalize("NFC")}
                  </h1>
                </div>
                <div className="bg-[#1A120B] text-white text-xs font-semibold px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                  <Lock size={12} />
                  <span>{"100% Cashless • An Toàn".normalize("NFC")}</span>
                </div>
              </div>

              {/* Toast / Alert Exception Error Box (Khi thanh toán lỗi) */}
              {/* Banner Thông Báo Đã Hủy Giao Dịch ZaloPay */}
              {isCanceled && (
                <div className="bg-[#FFFBEB] border-2 border-[#FCD34D] rounded-2xl p-4 flex gap-3 items-start mb-6">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-[#78350F]">
                      {"Giao dịch trên Cổng ZaloPay đã được hủy".normalize("NFC")}
                    </h4>
                    <p className="text-xs text-[#92400E] mt-0.5 leading-relaxed">
                      {"Bạn vừa hủy thanh toán trên Cổng ZaloPay. Đơn hàng và giỏ hàng của bạn vẫn được lưu giữ nguyên vẹn để bạn có thể chọn lại phương thức hoặc thanh toán lại bất kỳ lúc nào.".normalize("NFC")}
                    </p>
                  </div>
                </div>
              )}
              {errorMessage && (
                <div className="bg-[#FEF2F2] border-2 border-[#FCA5A5] rounded-2xl p-4 flex gap-3 items-start animate-shake">
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertCircle size={18} strokeWidth={2.5} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold font-serif text-[#991B1B] mb-0.5">
                      {"Thanh toán không thành công".normalize("NFC")}
                    </h3>
                    <p className="text-xs text-red-700 leading-relaxed font-body">
                      {errorMessage}
                    </p>
                    <p className="text-[10px] text-stone-500 mt-2 font-mono bg-white/80 px-2 py-1 rounded inline-block border border-red-100">
                      {"Mã khóa Idempotency mới: ".normalize("NFC")}
                      {idempotencyKey.slice(0, 18)}...
                    </p>
                  </div>
                </div>
              )}

              {/* 2. Danh sách các phương thức thanh toán (Radio Cards) */}
              <div className="flex flex-col gap-3.5">
                {/* ── Lựa chọn 1: Chuyển khoản VietQR / Ví điện tử [Mặc định Active] ── */}
                <div
                  onClick={() => setSelectedMethod("EWALLET")}
                  className={`cursor-pointer rounded-2xl p-4 md:p-5 transition-all border-2 ${selectedMethod === "EWALLET"
                      ? "border-[#1A120B] bg-[#F9F7F5] shadow-xs"
                      : "border-[#EDE7DE] bg-[#F9F7F5] hover:border-stone-300"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Radio Circle với dấu check trắng: Cố định kích thước tròn hoàn hảo với shrink-0 aspect-square */}
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 transition-colors shrink-0 aspect-square text-xs ${selectedMethod === "EWALLET"
                            ? "bg-[#1C130D] text-white"
                            : "border-2 border-stone-300 bg-white"
                          }`}
                      >
                        {selectedMethod === "EWALLET" && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm md:text-base text-[#1A120B]">
                            {"Chuyển khoản VietQR / Ví điện tử".normalize("NFC")}
                          </span>
                          <span className="bg-[#FDF0E6] text-[#C25E00] text-[11px] font-bold px-2 py-0.5 rounded-full">
                            {"Khuyên dùng".normalize("NFC")}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {"Quét mã QR bằng hơn 40 app Ngân hàng (MB, VCB, Techcombank...) hoặc Ví MoMo, ZaloPay".normalize(
                            "NFC"
                          )}
                        </p>
                      </div>
                    </div>

                    {/* 2 khối riêng biệt: cùng nền xám be bg-[#F4EFEA], VietQR chữ xanh, NAPAS 247 chữ đỏ */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] font-sans font-bold px-2 py-0.5 rounded-md bg-[#E5F3FF] text-[#0068FF] border border-[#BCE0FD] tracking-wide flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#0068FF] animate-pulse" />
                        ZaloPay Sandbox
                      </span>
                      <span className="text-[11px] font-sans font-bold px-2 py-0.5 rounded-md bg-[#E6F0FA] text-[#005BAA] border border-[#B8D5F2] tracking-wide">
                        VietQR
                      </span>
                    </div>
                  </div>

                  {/* Khối mở rộng con: Hỗ trợ cả ZaloPay Sandbox (Bên thứ ba VNG) và VietQR Ngân Hàng */}
                  {selectedMethod === "EWALLET" && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 pt-4 border-t border-[#EAE4DC] bg-white rounded-2xl p-4 md:p-5 flex flex-col gap-4 border border-[#EDE7DE] shadow-2xs"
                    >
                      {/* Tabs Chuyển Đổi Phương Thức EWALLET */}
                      <div className="flex items-center gap-2 p-1 bg-[#FAF6F0] rounded-xl border border-[#EDE7DE]">
                        <button
                          type="button"
                          onClick={() => setEwalletProvider("ZALOPAY")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            ewalletProvider === "ZALOPAY"
                              ? "bg-[#0068FF] text-white shadow-xs"
                              : "text-stone-600 hover:text-stone-900 bg-transparent"
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          {"Ví ZaloPay Sandbox (Bên thứ ba VNG)".normalize("NFC")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setEwalletProvider("VIETQR")}
                          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            ewalletProvider === "VIETQR"
                              ? "bg-[#1A120B] text-white shadow-xs"
                              : "text-stone-600 hover:text-stone-900 bg-transparent"
                          }`}
                        >
                          {"Chuyển khoản VietQR (MB Bank)".normalize("NFC")}
                        </button>
                      </div>

                      {/* Giao diện 1: ZaloPay Sandbox */}
                      {ewalletProvider === "ZALOPAY" ? (
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-5 pt-1">
                          {/* Cột Trái: Mã QR ZaloPay */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="relative w-[180px] h-[180px] bg-white border-2 border-[#0068FF]/30 rounded-2xl p-2 shadow-xs flex items-center justify-center overflow-hidden">
                              {zaloPayLoading ? (
                                <div className="flex flex-col items-center gap-2 text-stone-500 text-xs">
                                  <div className="w-6 h-6 border-2 border-[#0068FF] border-t-transparent rounded-full animate-spin" />
                                  <span>{"Đang kết nối ZaloPay...".normalize("NFC")}</span>
                                </div>
                              ) : (
                                <Image
                                  src={
                                    zaloPayData?.orderUrl
                                      ? `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(
                                          zaloPayData.orderUrl
                                        )}`
                                      : `https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${order.totalAmount}&addInfo=BREWLITE_${order.id}&accountName=BREWLITE%20ROASTERY`
                                  }
                                  alt="Mã QR ZaloPay Sandbox"
                                  fill
                                  unoptimized
                                  sizes="180px"
                                  className="object-contain p-1"
                                />
                              )}
                            </div>
                            <span className="text-[10px] text-stone-600 mt-2 font-medium flex items-center gap-1">
                              <QrCode size={11} className="text-[#0068FF]" />
                              {"Quét bằng ZaloPay Sandbox / Zalo".normalize("NFC")}
                            </span>
                          </div>

                          {/* Cột Phải: Thông tin ZaloPay và Nút hành động */}
                          <div className="flex-1 w-full flex flex-col gap-2.5 text-xs">
                            <div className="bg-[#F0F7FF] rounded-xl p-3.5 border border-[#CCE4FF] flex flex-col gap-2">
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#D8EAFD]">
                                <span className="text-stone-600">{"Cổng thanh toán:".normalize("NFC")}</span>
                                <span className="font-bold text-[#0068FF] flex items-center gap-1">
                                  {"ZaloPay Sandbox (VNG)"}
                                  <span className="bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                                    LIVE
                                  </span>
                                </span>
                              </div>

                              <div className="flex items-center justify-between pb-1.5 border-b border-[#D8EAFD]">
                                <span className="text-stone-600">{"Mã giao dịch (app_trans_id):".normalize("NFC")}</span>
                                <span className="font-mono font-bold text-xs text-stone-800">
                                  {zaloPayData?.appTransId || "Đang khởi tạo..."}
                                </span>
                              </div>

                              <div className="flex items-center justify-between pb-1.5 border-b border-[#D8EAFD]">
                                <span className="text-stone-600">{"Số tiền thanh toán:".normalize("NFC")}</span>
                                <span className="font-sans font-bold text-sm text-[#0068FF]">
                                  {vnd(order.totalAmount)}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-stone-600">{"Trạng thái đồng bộ:".normalize("NFC")}</span>
                                <span className="text-stone-700 font-medium flex items-center gap-1.5 text-[11px]">
                                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                  {"Lắng nghe Webhook & Polling 3s...".normalize("NFC")}
                                </span>
                              </div>
                            </div>

                            {/* Nút Mở Cổng ZaloPay Tab Mới */}
                            {zaloPayData?.orderUrl && (
                              <button
                                type="button"
                                onClick={() => window.open(zaloPayData.orderUrl, "_blank")}
                                className="w-full py-2 px-3 bg-[#0068FF] hover:bg-[#0052CC] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
                              >
                                <ExternalLink size={13} />
                                {"Mở Cổng Thanh Toán ZaloPay (Thanh toán Sandbox trên Web)".normalize("NFC")}
                              </button>
                            )}

                            {/* Nút Chuyển sang Cổng Thanh Toán ZaloPay Gateway */}
                            <button
                              type="button"
                              onClick={() => {
                                router.push(
                                  `/gateway/zalopay?orderId=${order.id}&amount=${order.totalAmount}&appTransId=${encodeURIComponent(
                                    zaloPayData?.appTransId || ""
                                  )}&token=${encodeURIComponent(zaloPayData?.zpTransToken || "")}`
                                );
                              }}
                              className="w-full py-3 px-4 bg-gradient-to-r from-[#0068FF] to-[#0052CC] hover:from-[#0052CC] hover:to-[#003E99] text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition shadow-md hover:shadow-lg cursor-pointer transform hover:-translate-y-0.5"
                            >
                              <span>{"Chuyển sang Cổng thanh toán ZaloPay Gateway".normalize("NFC")}</span>
                              <ArrowRight size={16} />
                            </button>

                            {/* Hướng dẫn thanh toán */}
                            <div className="flex items-start gap-1.5 text-[11px] text-[#2C5282] bg-[#EBF8FF] p-2.5 rounded-xl border border-[#BEE3F8]">
                              <ShieldCheck size={14} className="text-[#0068FF] shrink-0 mt-0.5" />
                              <span>
                                {"Quét mã trên app hoặc mở Cổng ZaloPay để thanh toán thử nghiệm. Trang web sẽ tự động chuyển trang ngay khi giao dịch hoàn tất.".normalize("NFC")}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row items-center md:items-start gap-5 pt-1">
                          {/* Cột Trái: Ảnh VietQR Động */}
                          <div className="flex flex-col items-center shrink-0">
                            <div className="relative w-[170px] h-[170px] bg-white border border-[#EAE4DC] rounded-2xl p-2 shadow-xs flex items-center justify-center overflow-hidden">
                              <Image
                                src={`https://img.vietqr.io/image/MB-0987654321-compact2.png?amount=${order.totalAmount}&addInfo=BREWLITE_${order.id}&accountName=BREWLITE%20ROASTERY`}
                                alt="VietQR BrewLite Roastery"
                                fill
                                unoptimized
                                sizes="170px"
                                className="object-contain p-1"
                              />
                            </div>
                            <span className="text-[10px] text-stone-500 mt-1.5 font-medium flex items-center gap-1">
                              <QrCode size={11} className="text-[#845326]" />
                              {"Quét tự động điền số tiền & nội dung".normalize("NFC")}
                            </span>
                          </div>

                          {/* Cột Phải: Thông tin số tài khoản và nút Copy nhanh */}
                          <div className="flex-1 w-full flex flex-col gap-2.5 text-xs">
                            <div className="bg-[#FAF6F0] rounded-xl p-3 border border-[#EBE4D8] flex flex-col gap-2">
                              {/* Ngân hàng */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#EFEAE2]">
                                <span className="text-stone-500">{"Ngân hàng nhận:".normalize("NFC")}</span>
                                <span className="font-bold text-[#1A120B]">
                                  {"MB Bank (Ngân hàng Quân Đội)".normalize("NFC")}
                                </span>
                              </div>

                              {/* Chủ tài khoản */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#EFEAE2]">
                                <span className="text-stone-500">{"Chủ tài khoản:".normalize("NFC")}</span>
                                <span className="font-bold text-[#1A120B] tracking-wide">
                                  {"BREWLITE ROASTERY"}
                                </span>
                              </div>

                              {/* Số tài khoản + Nút sao chép */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#EFEAE2]">
                                <span className="text-stone-500">{"Số tài khoản:".normalize("NFC")}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-sm text-[#1A120B]">
                                    0987654321
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy("0987654321", "accountNumber");
                                    }}
                                    className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 text-[#845326] border border-stone-200 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    {copiedField === "accountNumber" ? (
                                      <>
                                        <CheckCheck size={11} className="text-emerald-600" />
                                        <span className="text-emerald-600">{"Đã chép".normalize("NFC")}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} />
                                        <span>{"Sao chép".normalize("NFC")}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* Số tiền */}
                              <div className="flex items-center justify-between pb-1.5 border-b border-[#EFEAE2]">
                                <span className="text-stone-500">{"Số tiền chuyển:".normalize("NFC")}</span>
                                <span className="font-sans font-bold text-sm text-[#A47148]">
                                  {vnd(order.totalAmount)}
                                </span>
                              </div>

                              {/* Nội dung chuyển khoản + Nút sao chép */}
                              <div className="flex items-center justify-between">
                                <span className="text-stone-500">{"Nội dung chuyển:".normalize("NFC")}</span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#E2D8CC] text-[#1A120B]">
                                    {`BREWLITE_${order.id}`}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCopy(`BREWLITE_${order.id}`, "memo");
                                    }}
                                    className="px-2 py-0.5 rounded bg-white hover:bg-stone-100 text-[#845326] border border-stone-200 text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  >
                                    {copiedField === "memo" ? (
                                      <>
                                        <CheckCheck size={11} className="text-emerald-600" />
                                        <span className="text-emerald-600">{"Đã chép".normalize("NFC")}</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy size={11} />
                                        <span>{"Sao chép".normalize("NFC")}</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Hướng dẫn xác nhận */}
                            <div className="flex items-start gap-1.5 text-[11px] text-[#654E44] bg-[#F5EDE2] p-2.5 rounded-xl border border-[#EAE0D2]">
                              <ShieldCheck size={14} className="text-emerald-700 shrink-0 mt-0.5" />
                              <span>
                                {"Sau khi hoàn tất chuyển khoản trên ứng dụng ngân hàng, vui lòng nhấn nút ".normalize("NFC")}
                                <strong>{"\"Xác nhận đã chuyển khoản\"".normalize("NFC")}</strong>
                                {" bên dưới để Barista bắt đầu pha chế ngay.".normalize("NFC")}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Lựa chọn 2: Thẻ tín dụng / Ghi nợ ── */}
                <div
                  onClick={() => setSelectedMethod("BANK_CARD")}
                  className={`cursor-pointer rounded-2xl p-4 md:p-5 transition-all border-2 ${selectedMethod === "BANK_CARD"
                      ? "border-[#1A120B] bg-[#F9F7F5] shadow-xs"
                      : "border-[#EDE7DE] bg-[#F9F7F5] hover:border-stone-300"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 transition-colors shrink-0 aspect-square text-xs ${selectedMethod === "BANK_CARD"
                            ? "bg-[#1C130D] text-white"
                            : "border-2 border-stone-300 bg-white"
                          }`}
                      >
                        {selectedMethod === "BANK_CARD" && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm md:text-base text-[#1A120B]">
                            {"Thẻ tín dụng / Ghi nợ".normalize("NFC")}
                          </span>
                          <span className="bg-[#EFEAE2] text-[#654E44] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            Napas • Visa • Master
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {"Xác thực 3D Secure bảo mật tiêu chuẩn quốc tế".normalize("NFC")}
                        </p>
                      </div>
                    </div>

                    <div className="w-8 h-8 rounded-lg bg-[#EFECE8] flex items-center justify-center text-stone-700 shrink-0">
                      <CreditCard size={18} strokeWidth={1.8} />
                    </div>
                  </div>

                  {/* Khối mở rộng con: Mock Stripe Element Card Form */}
                  {selectedMethod === "BANK_CARD" && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 pt-4 border-t border-[#EAE4DC] bg-white rounded-2xl p-4 md:p-5 flex flex-col gap-4 border border-[#EDE7DE] shadow-2xs"
                    >
                      {/* Thẻ Ngân Hàng Ảo Trực Quan (Tỉ Lệ Khung Hình Chuẩn ISO 85.6mm x 53.98mm ~ aspect-[1.586/1]) */}
                      <div className="relative w-full max-w-[345px] aspect-[1.586/1] mx-auto rounded-2xl p-5 sm:p-6 text-white shadow-xl overflow-hidden bg-gradient-to-br from-[#1C130D] via-[#2D1E16] to-[#4A3222] border border-[#6B4B36]/50 flex flex-col justify-between select-none">
                        {/* Họa tiết nền sang trọng */}
                        <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
                        <div className="absolute right-12 -bottom-10 w-32 h-32 rounded-full bg-amber-500/10 pointer-events-none" />

                        {/* Top: EMV Chip & Brand Logo */}
                        <div className="flex items-center justify-between relative z-10">
                          {/* Chip EMV và sóng Contactless */}
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-8 rounded-md bg-gradient-to-tr from-amber-300 via-amber-200 to-yellow-100 border border-amber-400/70 p-1 flex flex-col justify-between shadow-xs">
                              <div className="w-full h-[1px] bg-amber-600/40" />
                              <div className="w-full h-[1px] bg-amber-600/40" />
                            </div>
                            <svg className="w-4 h-4 text-stone-300/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M8.5 16.5a5 5 0 0 1 0-9" />
                              <path d="M12 19a8.5 8.5 0 0 0 0-14" />
                              <path d="M15.5 21.5a12 12 0 0 0 0-19" />
                            </svg>
                          </div>

                          {/* Brand Logo */}
                          <div className="text-right">
                            {cardBrand === "visa" && (
                              <span className="font-sans font-black italic text-xl tracking-wider text-white drop-shadow-sm">
                                VISA
                              </span>
                            )}
                            {cardBrand === "mastercard" && (
                              <div className="flex items-center">
                                <div className="w-6 h-6 rounded-full bg-[#EB001B] opacity-90 -mr-2.5 shadow-xs" />
                                <div className="w-6 h-6 rounded-full bg-[#F79E1B] opacity-90 shadow-xs" />
                              </div>
                            )}
                            {cardBrand === "napas" && (
                              <span className="font-sans font-extrabold text-sm tracking-wider text-[#E31E24] bg-white px-2 py-0.5 rounded shadow-xs">
                                NAPAS
                              </span>
                            )}
                            {cardBrand === "card" && (
                              <span className="font-mono text-xs tracking-wider text-stone-300">
                                BREWLITE PAY
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Middle: Card Number (font monospace lớn thoáng) */}
                        <div className="relative z-10 my-auto py-2">
                          <span className="tracking-[0.22em] font-mono text-lg md:text-xl font-bold text-[#FAF6F0] drop-shadow-sm block">
                            {cardNumber || "•••• •••• •••• ••••"}
                          </span>
                        </div>

                        {/* Bottom: Cardholder Name & Expiry */}
                        <div className="flex items-end justify-between relative z-10 pt-2 border-t border-white/10 text-[10px] uppercase tracking-wider text-stone-300 font-sans">
                          <div>
                            <span className="text-[8px] text-stone-400 block tracking-normal">{"Chủ thẻ".normalize("NFC")}</span>
                            <span className="font-bold text-white tracking-wide truncate max-w-[170px] inline-block text-xs">
                              {cardName || "BREWLITE GUEST"}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="text-[8px] text-stone-400 block tracking-normal">{"Hết hạn".normalize("NFC")}</span>
                            <span className="font-mono font-bold text-white tracking-widest text-xs">
                              {cardExpiry || "MM/YY"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mock Stripe Element Form Inputs */}
                      <div className="space-y-3 text-xs">
                        {/* Số thẻ */}
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            {"Số thẻ tín dụng / ghi nợ".normalize("NFC")}
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={cardNumber}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 16);
                                const formatted = val.replace(/(\d{4})(?=\d)/g, "$1 ");
                                setCardNumber(formatted);
                              }}
                              placeholder="4242 4242 4242 4242"
                              maxLength={19}
                              className="w-full pl-9 pr-14 py-2.5 rounded-xl border border-[#D9D0C3] bg-[#FAF8F5] focus:bg-white focus:outline-hidden focus:border-[#845326] focus:ring-1 focus:ring-[#845326] font-mono text-sm tracking-wider text-stone-900 transition-colors"
                            />
                            <CreditCard size={16} className="absolute left-3 top-3 text-stone-400" />
                            <span className="absolute right-3 top-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-700 uppercase">
                              {cardBrand}
                            </span>
                          </div>
                        </div>

                        {/* 2 Cột: Ngày hết hạn & CVC */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                              {"Ngày hết hạn (MM/YY)".normalize("NFC")}
                            </label>
                            <input
                              type="text"
                              value={cardExpiry}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                                const formatted = val.length > 2 ? `${val.slice(0, 2)}/${val.slice(2)}` : val;
                                setCardExpiry(formatted);
                              }}
                              placeholder="12/28"
                              maxLength={5}
                              className="w-full px-3 py-2.5 rounded-xl border border-[#D9D0C3] bg-[#FAF8F5] focus:bg-white focus:outline-hidden focus:border-[#845326] focus:ring-1 focus:ring-[#845326] font-mono text-sm tracking-wider text-stone-900 text-center transition-colors"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-stone-700 mb-1 flex items-center justify-between">
                              <span>{"Mã CVC / CVV".normalize("NFC")}</span>
                              <span className="text-[10px] text-stone-400 font-normal">{"3 số sau thẻ".normalize("NFC")}</span>
                            </label>
                            <div className="relative">
                              <input
                                type="password"
                                value={cardCvc}
                                onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                                placeholder="•••"
                                maxLength={4}
                                className="w-full pl-3 pr-8 py-2.5 rounded-xl border border-[#D9D0C3] bg-[#FAF8F5] focus:bg-white focus:outline-hidden focus:border-[#845326] focus:ring-1 focus:ring-[#845326] font-mono text-sm tracking-wider text-stone-900 text-center transition-colors"
                              />
                              <Lock size={14} className="absolute right-3 top-3 text-stone-400" />
                            </div>
                          </div>
                        </div>

                        {/* Tên in trên thẻ */}
                        <div>
                          <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                            {"Tên in trên thẻ (không dấu)".normalize("NFC")}
                          </label>
                          <input
                            type="text"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value.toUpperCase())}
                            placeholder="NGUYEN VAN A"
                            className="w-full px-3 py-2.5 rounded-xl border border-[#D9D0C3] bg-[#FAF8F5] focus:bg-white focus:outline-hidden focus:border-[#845326] focus:ring-1 focus:ring-[#845326] font-sans uppercase text-sm font-semibold text-stone-900 transition-colors"
                          />
                        </div>

                        {/* Nút Điền Thẻ Test & Chứng chỉ bảo mật */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-stone-100">
                          <button
                            type="button"
                            onClick={() => {
                              setCardNumber("4242 4242 4242 4242");
                              setCardExpiry("12/28");
                              setCardCvc("888");
                              setCardName("BREWLITE TEST CARD");
                            }}
                            className="text-xs text-[#845326] hover:text-[#5c3717] font-semibold flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FAF3EC] border border-[#ECDCCB] hover:bg-[#F3E6D9] transition-colors cursor-pointer"
                          >
                            <Sparkles size={13} className="text-[#A47148]" />
                            <span>{"Điền nhanh thẻ test Stripe (4242...)".normalize("NFC")}</span>
                          </button>

                          <span className="text-[10px] text-stone-500 flex items-center gap-1 font-medium">
                            <ShieldCheck size={12} className="text-emerald-700" />
                            {"Mã hóa PCI-DSS & 3D Secure".normalize("NFC")}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Lựa chọn 3: Apple Pay & Google Wallet ── */}
                <div
                  onClick={() => setSelectedMethod("APPLE_PAY")}
                  className={`cursor-pointer rounded-2xl p-4 md:p-5 transition-all border-2 ${selectedMethod === "APPLE_PAY"
                      ? "border-[#1A120B] bg-[#F9F7F5] shadow-xs"
                      : "border-[#EDE7DE] bg-[#F9F7F5] hover:border-stone-300"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center mt-0.5 transition-colors shrink-0 aspect-square text-xs ${selectedMethod === "APPLE_PAY"
                            ? "bg-[#1C130D] text-white"
                            : "border-2 border-stone-300 bg-white"
                          }`}
                      >
                        {selectedMethod === "APPLE_PAY" && <Check size={12} strokeWidth={3} />}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm md:text-base text-[#1A120B]">
                            {"Apple Pay & Google Wallet".normalize("NFC")}
                          </span>
                          <span className="bg-[#EFEAE2] text-[#654E44] text-[10px] font-semibold px-2 py-0.5 rounded-full">
                            {"1-Chạm".normalize("NFC")}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-1">
                          {"Thanh toán không tiếp xúc trực tiếp từ thiết bị di động".normalize(
                            "NFC"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2.5 py-1 rounded-md bg-black text-white flex items-center shadow-xs">
                        <ApplePayLogo className="h-3.5 w-auto fill-white" />
                      </span>
                    </div>
                  </div>

                  {/* Khối mở rộng con: Apple Pay & Google Wallet Express Checkout */}
                  {selectedMethod === "APPLE_PAY" && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="mt-4 pt-4 border-t border-[#EAE4DC] bg-white rounded-2xl p-4 md:p-5 flex flex-col gap-4 border border-[#EDE7DE] shadow-2xs"
                    >
                      {/* Khối thẻ liên kết trong Wallet */}
                      <div className="bg-[#FAF7F3] p-3.5 rounded-xl border border-[#EDE4D8] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-7 rounded-lg bg-[#1C130D] text-white flex items-center justify-center shadow-xs shrink-0">
                            <AppleLogo className="h-4.5 w-auto fill-white" />
                          </div>
                          <div>
                            <div className="font-bold text-xs text-[#1A120B] flex items-center gap-1.5">
                              <span>{"Techcombank Visa (Apple Wallet)".normalize("NFC")}</span>
                              <span className="text-[9px] bg-emerald-100 text-emerald-800 font-semibold px-1.5 py-0.5 rounded-full">
                                {"Mặc định".normalize("NFC")}
                              </span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-mono mt-0.5">•••• 8899</p>
                          </div>
                        </div>
                        <span className="font-sans font-bold text-xs text-[#845326]">
                          {vnd(order.totalAmount)}
                        </span>
                      </div>

                      {/* Hai nút 1-chạm: Apple Pay & Google Pay */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => triggerBiometric("APPLE_PAY")}
                          className="bg-black hover:bg-neutral-900 text-white font-medium h-12 px-5 rounded-xl flex items-center justify-center gap-1 shadow-xs transition active:scale-[0.98] cursor-pointer"
                        >
                          <ApplePayLogo className="h-[18px] w-auto fill-white shrink-0" />
                          <span className="font-semibold text-sm text-white">với Face ID</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerBiometric("GOOGLE_PAY")}
                          className="bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-medium h-12 px-5 rounded-xl flex items-center justify-center gap-2 text-sm shadow-2xs transition active:scale-[0.98] cursor-pointer"
                        >
                          <span className="font-bold text-base text-blue-600">G</span>
                          <span className="font-semibold text-stone-800">Pay 1-Chạm</span>
                        </button>
                      </div>

                      {/* Chú thích sinh trắc học */}
                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#654E44] bg-[#FAF5EE] py-2 px-3 rounded-lg border border-[#EDE4D8]">
                        <ScanFace size={13} className="text-[#845326] shrink-0" />
                        <span>
                          {"Chạm để kích hoạt xác thực Face ID / Vân tay không cần nhập thông tin".normalize("NFC")}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 3. Khối Cam kết trải nghiệm 100% Cashless */}
              <div className="bg-[#F5EFEB] rounded-2xl p-4 border border-[#EBE4D8] flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#EAE2D5] flex items-center justify-center text-[#845326] shrink-0 mt-0.5">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="font-bold text-xs md:text-sm text-[#1A120B]">
                    {"Cam kết Trải nghiệm 100% Cashless".normalize("NFC")}
                  </h3>
                  <p className="text-xs text-[#504440] leading-relaxed mt-1">
                    {
                      "BrewLite vận hành mô hình không dùng tiền mặt nhằm tối ưu tốc độ phục vụ và giữ quầy bar sạch sẽ, thơm mùi hạt rang. Mọi giao dịch được mã hóa PCI-DSS cấp độ 1 và gửi lệnh tự động đến Barista ngay lập tức.".normalize(
                        "NFC"
                      )
                    }
                  </p>
                </div>
              </div>

              {/* 4. Mini Toggle Switch Demo Mode (Tinh tế & Gọn gàng) */}
              <div className="flex items-center justify-between py-1 px-1 text-xs text-stone-500">
                <div className="flex items-center gap-1.5">
                  <span>🧪</span>
                  <span className="text-stone-600 font-medium">
                    {"Demo Mode: Giả lập lỗi thanh toán".normalize("NFC")}
                  </span>
                </div>
                <button
                  type="button"
                  id="simulateFailureToggle"
                  role="switch"
                  aria-checked={simulateFailure}
                  onClick={() => setSimulateFailure(!simulateFailure)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${simulateFailure ? "bg-red-500" : "bg-stone-300"
                    }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${simulateFailure ? "translate-x-4" : "translate-x-0"
                      }`}
                  />
                </button>
              </div>

              {/* 5. Nút Hành động Chính: Pill button màu đen nguyên khối py-3.5 */}
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  id="confirmPaymentBtn"
                  onClick={handlePayment}
                  disabled={
                    isProcessing ||
                    order.status === "CANCELLED" ||
                    (checkoutRemaining !== null && checkoutRemaining <= 0)
                  }
                  className={`w-full py-3.5 px-6 rounded-full font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${simulateFailure
                      ? "bg-red-600 hover:bg-red-700 text-white"
                      : order.status === "CANCELLED" || (checkoutRemaining !== null && checkoutRemaining <= 0)
                      ? "bg-stone-400 text-stone-100"
                      : "bg-[#1A120B] hover:bg-black text-white"
                    }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      <span>{"Đang xử lý giao dịch...".normalize("NFC")}</span>
                    </>
                  ) : order.status === "CANCELLED" || (checkoutRemaining !== null && checkoutRemaining <= 0) ? (
                    <>
                      <XCircle size={18} />
                      <span>{"Đơn hàng đã hết hạn (quá 5 phút)".normalize("NFC")}</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span className="font-sans font-bold">
                        {simulateFailure
                          ? "Thử nghiệm Lỗi Thanh toán (Demo)".normalize("NFC")
                          : selectedMethod === "EWALLET"
                            ? `Xác nhận đã chuyển khoản • ${vnd(order.totalAmount)} →`.normalize("NFC")
                            : selectedMethod === "BANK_CARD"
                              ? `Thanh toán qua Thẻ • ${vnd(order.totalAmount)} →`.normalize("NFC")
                              : `Xác thực 1-Chạm • ${vnd(order.totalAmount)} →`.normalize("NFC")}
                      </span>
                    </>
                  )}
                </button>

                {/* 6. Footer dưới nút bấm */}
                <div className="flex items-center justify-between text-xs text-stone-500 px-2 pt-1 font-body">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-700" />
                    <span>{"Bảo mật 256-bit SSL".normalize("NFC")}</span>
                  </div>
                  <Link
                    href="/cart"
                    className="hover:text-[#1A120B] hover:underline transition-colors"
                  >
                    {"Quay lại giỏ hàng".normalize("NFC")}
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════
            HÀNG DƯỚI CÙNG: 3 FEATURE COMMITMENT CARDS (CHUẨN 100% GỐC)
           ════════════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8 pt-6 border-t border-[#F0EAE1]">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-4 border border-[#F0EAE1] shadow-2xs flex items-center gap-3.5">
            <Leaf size={22} strokeWidth={1.8} className="text-[#845326] shrink-0" />
            <div>
              <h4 className="font-medium text-stone-900 text-sm">
                {"Eco-Friendly Cup".normalize("NFC")}
              </h4>
              <p className="text-stone-500 text-xs mt-0.5">
                {"Cốc bã mía phân hủy 100%".normalize("NFC")}
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-4 border border-[#F0EAE1] shadow-2xs flex items-center gap-3.5">
            <Clock size={22} strokeWidth={1.8} className="text-[#845326] shrink-0" />
            <div>
              <h4 className="font-medium text-stone-900 text-sm">
                {"Không Cần Xếp Hàng".normalize("NFC")}
              </h4>
              <p className="text-stone-500 text-xs mt-0.5">
                {"Đến lấy nước ngay khi sẵn sàng".normalize("NFC")}
              </p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-4 border border-[#F0EAE1] shadow-2xs flex items-center gap-3.5">
            <Sparkles size={22} strokeWidth={1.8} className="text-[#845326] shrink-0" />
            <div>
              <h4 className="font-medium text-stone-900 text-sm">
                {"Hạt Vàng BrewClub".normalize("NFC")}
              </h4>
              <p className="text-stone-500 text-xs mt-0.5">
                {"Tích điểm tự động theo SĐT".normalize("NFC")}
              </p>
            </div>
          </div>
        </div>

        {/* ── Mock Apple Pay & Google Wallet Biometric Sheet (1-Chạm Face ID) ── */}
        {showBiometricModal && order && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4">
            <div
              className="bg-[#F8F6F2] w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-white/60 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-center justify-between border-b border-[#E8DFD5] pb-3">
                <div className="flex items-center gap-2">
                  {biometricType === "APPLE_PAY" ? (
                    <div className="px-2.5 py-1 rounded bg-black text-white flex items-center shadow-xs">
                      <ApplePayLogo className="h-4 w-auto fill-white" />
                    </div>
                  ) : (
                    <div className="px-2.5 py-1 rounded bg-white border border-stone-200 text-stone-800 text-xs font-bold flex items-center gap-1">
                      <span className="text-blue-600 font-extrabold">G</span> Pay
                    </div>
                  )}
                  <span className="text-xs font-bold text-[#1A120B]">BrewLite Roastery</span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowBiometricModal(false)}
                  className="w-7 h-7 rounded-full bg-stone-200 hover:bg-stone-300 text-stone-600 flex items-center justify-center transition cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Thông tin đơn thanh toán */}
              <div className="bg-white rounded-2xl p-4 border border-[#EDE7DE] flex flex-col gap-2.5 shadow-2xs">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100">
                  <span className="text-stone-500">{"Mã đơn hàng:".normalize("NFC")}</span>
                  <span className="font-mono font-bold text-stone-800">#{order.id}</span>
                </div>
                <div className="flex items-center justify-between text-xs pb-2 border-b border-stone-100">
                  <span className="text-stone-500">{"Thẻ thanh toán:".normalize("NFC")}</span>
                  <span className="font-mono text-stone-800 font-medium">Techcombank Visa •••• 8899</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs font-semibold text-stone-600">{"Tổng thanh toán:".normalize("NFC")}</span>
                  <span className="font-sans font-black text-lg text-[#1A120B]">
                    {vnd(order.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Khu vực Animation Sinh Trắc Học Face ID */}
              <div className="py-3 flex flex-col items-center justify-center gap-3">
                <div className="relative w-20 h-20 rounded-2xl bg-white border border-[#EDE7DE] shadow-inner flex items-center justify-center overflow-hidden">
                  {biometricState === "SCANNING" && (
                    <>
                      {/* Tia laser quét Face ID */}
                      <div className="absolute inset-x-2 h-1 bg-linear-to-r from-cyan-400 via-blue-500 to-indigo-500 rounded-full animate-bounce shadow-md shadow-blue-400/50" />
                      <ScanFace size={44} className="text-[#845326] animate-pulse" />
                    </>
                  )}

                  {biometricState === "SUCCESS" && (
                    <div className="text-emerald-600 flex items-center justify-center scale-110 transition-transform duration-300">
                      <CheckCircle2 size={46} strokeWidth={2.5} />
                    </div>
                  )}

                  {biometricState === "FAILED" && (
                    <div className="text-red-500 flex items-center justify-center scale-110 transition-transform duration-300">
                      <XCircle size={46} strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                <div className="text-center">
                  <p className="font-bold text-sm text-[#1A120B]">
                    {biometricState === "SCANNING" &&
                      (biometricType === "APPLE_PAY"
                        ? "Đang xác thực Face ID...".normalize("NFC")
                        : "Đang xác thực Vân tay...".normalize("NFC"))}
                    {biometricState === "SUCCESS" && "Xác thực thành công!".normalize("NFC")}
                    {biometricState === "FAILED" && "Xác thực thất bại (Demo)".normalize("NFC")}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {biometricState === "SCANNING" &&
                      "Vui lòng nhìn vào thiết bị để phê duyệt thanh toán".normalize("NFC")}
                    {biometricState === "SUCCESS" &&
                      "Đang kích hoạt pha chế tại quầy...".normalize("NFC")}
                    {biometricState === "FAILED" &&
                      "Giao dịch bị từ chối bởi ngân hàng".normalize("NFC")}
                  </p>
                </div>
              </div>

              {/* Nút hủy bên dưới */}
              <button
                type="button"
                onClick={() => setShowBiometricModal(false)}
                className="w-full py-2 text-center text-xs font-semibold text-stone-500 hover:text-stone-800 transition cursor-pointer"
              >
                {"Hủy giao dịch".normalize("NFC")}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer chính của website */}
      <Footer />
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#FAF6F0] flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-[#1A120B]/20 border-t-[#1A120B] rounded-full animate-spin" />
            <p className="text-stone-500 text-sm font-medium">
              {"Đang tải trang thanh toán...".normalize("NFC")}
            </p>
          </div>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

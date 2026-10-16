"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Coffee, Clock, Store } from "lucide-react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { apiFetch } from "../store/authStore";

interface ConfirmationOrderItem {
  id: number;
  productId: number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
  unitPrice: number;
}

interface ConfirmationOrderDetail {
  id: number;
  status: string;
  totalAmount: number;
  createdAt: string;
  items: ConfirmationOrderItem[];
}

function OrderConfirmationContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [order, setOrder] = useState<ConfirmationOrderDetail | null>(null);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    apiFetch(`/orders/${orderId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ConfirmationOrderDetail | null) => {
        if (data) setOrder(data);
      })
      .catch(console.error);
  }, [orderId]);

  const vnd = (n: number) => (n || 0).toLocaleString("vi-VN") + "đ";

  return (
    <div className="min-h-screen bg-[#fef8f4] text-[#1d1b19] flex flex-col font-body selection:bg-[#fedcc2] selection:text-[#2c1810]">
      <Header cartCount={0} activeTab="orders" />

      <main className="flex-1 w-full max-w-[800px] mx-auto px-4 md:px-8 py-10">
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 md:p-10 text-center flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5 ring-8 ring-emerald-50/50">
            <CheckCircle2 size={44} strokeWidth={2.2} />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold font-body bg-emerald-100 text-emerald-800 uppercase tracking-wider mb-2">
            Đã thanh toán thành công (PAID)
          </span>

          <h1 className="font-headline text-2xl md:text-3xl font-bold text-[#1d1b19] mb-2">
            Cảm ơn bạn đã đặt đồ uống tại BrewLite!
          </h1>
          <p className="text-stone-500 text-sm md:text-base max-w-md mx-auto mb-6">
            Đơn hàng #{orderId ?? "---"} đã được thanh toán không tiền mặt thành công và chuyển sang quầy pha chế.
          </p>

          {/* Chi tiết đơn */}
          {order && (
            <div className="w-full bg-[#f8f2ee] rounded-2xl p-5 mb-6 text-left flex flex-col gap-3">
              <div className="flex items-center justify-between pb-3 border-b border-stone-200">
                <span className="font-bold text-sm text-[#1d1b19]">Mã đơn hàng: #{order.id}</span>
                <span className="text-xs text-stone-500">
                  {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>

              <div className="flex flex-col gap-2 py-1">
                {order.items?.map((item) => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="text-stone-700">
                      <strong>{item.quantity}x</strong> {item.productName} ({item.size})
                      {item.toppings?.length > 0 && ` + ${item.toppings.join(", ")}`}
                    </span>
                    <span className="font-semibold text-stone-900">
                      {vnd(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-stone-200 flex justify-between items-center">
                <span className="font-bold text-sm text-stone-800">Tổng đã thanh toán:</span>
                <span className="font-headline text-lg font-bold text-[#2c1810]">
                  {vnd(order.totalAmount)}
                </span>
              </div>
            </div>
          )}

          {/* Barista info */}
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-3 mb-8 text-left">
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-stone-200">
              <Store size={20} className="text-[#845326] shrink-0" />
              <div>
                <p className="text-xs text-stone-500">Quầy nhận nước</p>
                <p className="text-sm font-bold text-[#1d1b19]">Downtown Roastery Bar</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-white border border-stone-200">
              <Clock size={20} className="text-[#845326] shrink-0" />
              <div>
                <p className="text-xs text-stone-500">Thời gian dự kiến</p>
                <p className="text-sm font-bold text-[#1d1b19]">Khoảng 3 - 5 phút nữa</p>
              </div>
            </div>
          </div>

          {/* Navigation CTA */}
          <div className="flex flex-wrap items-center justify-center gap-3 w-full">
            <Link
              href="/menu"
              className="px-6 py-3 rounded-xl bg-[#2c1810] text-white font-semibold text-sm hover:bg-[#845326] transition-all flex items-center gap-2 active:scale-95 shadow-sm"
            >
              <Coffee size={16} />
              <span>Tiếp tục đặt món khác</span>
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function OrderConfirmationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#2c1810]" />
        </div>
      }
    >
      <OrderConfirmationContent />
    </Suspense>
  );
}

import React, { Suspense } from "react";
import ProductDetailClient from "./ProductDetailClient";

// Disable instant-shell to prevent Next.js 16 prerender URL data error
export const instant = false;

export async function generateStaticParams() {
  return [1, 2, 3, 4, 5, 6, 7, 8].map((id) => ({
    id: id.toString(),
  }));
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fef8f4] flex items-center justify-center font-body">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-3 border-[#845326] border-t-transparent rounded-full animate-spin" />
            <span className="text-[13px] text-[#504440] font-semibold">
              {"Đang chuẩn bị trang chi tiết...".normalize("NFC")}
            </span>
          </div>
        </div>
      }
    >
      <ProductDetailClient paramsPromise={params} />
    </Suspense>
  );
}

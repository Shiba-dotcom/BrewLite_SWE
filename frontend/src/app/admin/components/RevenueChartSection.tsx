"use client";

import React, { useMemo, useState } from "react";

interface OrderItemDetail {
  id: number;
  productId: number;
  productName: string;
  size: string;
  toppings: string[];
  quantity: number;
  unitPrice: number;
}

interface OrderSummary {
  id: number;
  status: string;
  totalAmount: number;
  discountCode?: string | null;
  discountAmount?: number;
  createdAt: string;
  updatedAt?: string;
  staffId?: number | null;
  staffName?: string | null;
  items?: OrderItemDetail[];
}

interface ProductItem {
  id: number;
  name: string;
  category?: string;
  basePrice?: number;
}

interface Props {
  allOrders: OrderSummary[];
  products: any[];
}

const CATEGORY_NAMES: Record<string, string> = {
  vietnamese: "Cà Phê Phin Việt Nam",
  espresso: "Signature Espresso",
  tea: "Trà Trái Cây & Matcha",
  coldbrew: "Cold Brew Ủ Lạnh",
  bakery: "Bánh Ngọt Thủ Công",
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string }> = {
  vietnamese: { bg: "bg-amber-100", text: "text-amber-900", bar: "bg-[#9E5A2B]" },
  espresso: { bg: "bg-orange-100", text: "text-orange-900", bar: "bg-[#78350F]" },
  tea: { bg: "bg-emerald-100", text: "text-emerald-900", bar: "bg-emerald-600" },
  coldbrew: { bg: "bg-blue-100", text: "text-blue-900", bar: "bg-sky-600" },
  bakery: { bg: "bg-pink-100", text: "text-pink-900", bar: "bg-rose-500" },
};

export default function RevenueChartSection({ allOrders, products }: Props) {
  const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);

  // 1. Thống kê 7 ngày gần nhất (tính từ hôm nay lùi về 6 ngày trước)
  const last7DaysData = useMemo(() => {
    const days: {
      dateStr: string; // YYYY-MM-DD
      dayOfWeek: string;
      displayDate: string; // DD/MM
      isToday: boolean;
      revenue: number;
      orderCount: number;
      orders: OrderSummary[];
    }[] = [];

    const now = new Date();
    // Tạo mốc 7 ngày
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${day}`;

      const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
      const dayOfWeek = dayNames[d.getDay()];
      const isToday = i === 0;

      days.push({
        dateStr,
        dayOfWeek,
        displayDate: `${day}/${month}`,
        isToday,
        revenue: 0,
        orderCount: 0,
        orders: [],
      });
    }

    // Lọc và gộp đơn hàng
    allOrders.forEach((order: OrderSummary) => {
      const isCountable =
        order.status === "PAID" ||
        order.status === "PREPARING" ||
        order.status === "READY" ||
        order.status === "COMPLETED";

      if (!isCountable) return;

      const orderDate = new Date(order.createdAt);
      const oYear = orderDate.getFullYear();
      const oMonth = String(orderDate.getMonth() + 1).padStart(2, "0");
      const oDay = String(orderDate.getDate()).padStart(2, "0");
      const oDateStr = `${oYear}-${oMonth}-${oDay}`;

      const targetDay = days.find((d) => d.dateStr === oDateStr);
      if (targetDay) {
        targetDay.revenue += order.totalAmount;
        targetDay.orderCount += 1;
        targetDay.orders.push(order);
      }
    });

    return days;
  }, [allOrders]);

  // Max revenue để chia tỷ lệ biểu đồ
  const maxRevenue = useMemo(() => {
    const maxVal = Math.max(...last7DaysData.map((d) => d.revenue), 0);
    return maxVal > 0 ? maxVal * 1.15 : 100000; // Thêm 15% padding phía trên
  }, [last7DaysData]);

  // 2. Thống kê phân bổ theo danh mục sản phẩm
  const categoryStats = useMemo(() => {
    const productCategoryMap = new Map<number, string>();
    products.forEach((p) => {
      if (p?.id) {
        productCategoryMap.set(p.id, p.category || "vietnamese");
      }
    });

    const stats: Record<string, { name: string; revenue: number; quantity: number }> = {
      vietnamese: { name: CATEGORY_NAMES.vietnamese, revenue: 0, quantity: 0 },
      espresso: { name: CATEGORY_NAMES.espresso, revenue: 0, quantity: 0 },
      tea: { name: CATEGORY_NAMES.tea, revenue: 0, quantity: 0 },
      coldbrew: { name: CATEGORY_NAMES.coldbrew, revenue: 0, quantity: 0 },
      bakery: { name: CATEGORY_NAMES.bakery, revenue: 0, quantity: 0 },
    };

    let totalCatRevenue = 0;

    allOrders.forEach((order: OrderSummary) => {
      const isCountable =
        order.status === "PAID" ||
        order.status === "PREPARING" ||
        order.status === "READY" ||
        order.status === "COMPLETED";

      if (!isCountable || !order.items) return;

      order.items.forEach((item: OrderItemDetail) => {
        const cat = productCategoryMap.get(item.productId) || "vietnamese";
        if (!stats[cat]) {
          stats[cat] = {
            name: CATEGORY_NAMES[cat] || "Khác",
            revenue: 0,
            quantity: 0,
          };
        }
        const itemTotal = item.unitPrice * item.quantity;
        stats[cat].revenue += itemTotal;
        stats[cat].quantity += item.quantity;
        totalCatRevenue += itemTotal;
      });
    });

    return {
      list: Object.entries(stats)
        .map(([key, data]) => ({
          key,
          ...data,
          percent:
            totalCatRevenue > 0
              ? Math.round((data.revenue / totalCatRevenue) * 100)
              : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue),
      totalCatRevenue,
    };
  }, [allOrders, products]);

  // 3. Các chỉ số KPI 7 ngày
  const total7DaysRevenue = last7DaysData.reduce((acc, d) => acc + d.revenue, 0);
  const total7DaysOrders = last7DaysData.reduce((acc, d) => acc + d.orderCount, 0);
  const averageOrderValue =
    total7DaysOrders > 0 ? Math.round(total7DaysRevenue / total7DaysOrders) : 0;

  // Tọa độ SVG cho biểu đồ cột
  const chartWidth = 680;
  const chartHeight = 220;
  const paddingBottom = 40;
  const paddingTop = 30;
  const plotHeight = chartHeight - paddingBottom - paddingTop;
  const barSlotWidth = chartWidth / 7;
  const barWidth = 46;

  return (
    <div className="space-y-6">
      {/* KPI Highlight Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#E6DDD5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wider">
              Doanh Thu 7 Ngày Qua
            </p>
            <p className="text-xl font-extrabold text-[#2C1E18] mt-1 font-mono">
              {total7DaysRevenue.toLocaleString("vi-VN")}đ
            </p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              • Cập nhật theo thời gian thực
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#FAF0E6] text-[#9E5A2B] flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">bar_chart</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6DDD5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wider">
              Đơn Hàng Đã Xử Lý
            </p>
            <p className="text-xl font-extrabold text-[#2C1E18] mt-1 font-mono">
              {total7DaysOrders} đơn
            </p>
            <p className="text-[11px] text-[#7A6A5E] mt-0.5">
              Từ 7 ngày gần nhất
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">receipt_long</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6DDD5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wider">
              Giá Trị Đơn Trung Bình (AOV)
            </p>
            <p className="text-xl font-extrabold text-[#9E5A2B] mt-1 font-mono">
              {averageOrderValue.toLocaleString("vi-VN")}đ
            </p>
            <p className="text-[11px] text-[#7A6A5E] mt-0.5">
              Doanh thu / Tổng đơn
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">price_check</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#E6DDD5] shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7A6A5E] uppercase tracking-wider">
              Mặt Hàng Bán Ra
            </p>
            <p className="text-xl font-extrabold text-emerald-700 mt-1 font-mono">
              {categoryStats.list.reduce((acc, c) => acc + c.quantity, 0)} ly
            </p>
            <p className="text-[11px] text-emerald-600 font-bold mt-0.5">
              Đa dạng trên 5 danh mục
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">local_cafe</span>
          </div>
        </div>
      </div>

      {/* Grid: SVG Bar Chart 7 Days & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CỘT 1 & 2: Biểu đồ cột SVG Doanh Thu 7 Ngày */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E6DDD5] shadow-sm p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#F0EAE3]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#9E5A2B]" />
                <h2 className="font-headline text-base font-extrabold text-[#2C1E18]">
                  📊 Biểu Đồ Cột Doanh Thu 7 Ngày Gần Nhất
                </h2>
              </div>
              <p className="text-xs text-[#7A6A5E] mt-0.5">
                Trực quan hóa doanh số và số lượng đơn hàng theo từng ngày
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#7A6A5E] font-medium">
              <span className="inline-block w-2.5 h-2.5 rounded-xs bg-[#9E5A2B]" />
              <span>Doanh thu ngày</span>
              <span className="inline-block w-2.5 h-2.5 rounded-xs bg-[#D97706] ml-2" />
              <span>Hôm nay</span>
            </div>
          </div>

          {/* SVG Canvas Container */}
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-auto min-w-[500px] select-none"
            >
              <defs>
                {/* Gradient cột thường */}
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#9E5A2B" />
                  <stop offset="100%" stopColor="#C47A47" />
                </linearGradient>
                {/* Gradient cột Hôm Nay */}
                <linearGradient id="todayBarGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#D97706" />
                  <stop offset="100%" stopColor="#F59E0B" />
                </linearGradient>
              </defs>

              {/* Grid Lines ngang */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                const y = paddingTop + plotHeight * (1 - pct);
                const valueLabel = Math.round((maxRevenue * pct) / 1000) + "k";
                return (
                  <g key={idx}>
                    <line
                      x1="45"
                      y1={y}
                      x2={chartWidth - 10}
                      y2={y}
                      stroke="#F0E9E2"
                      strokeDasharray={pct === 0 ? "0" : "3,3"}
                      strokeWidth="1"
                    />
                    <text
                      x="40"
                      y={y + 3.5}
                      textAnchor="end"
                      fontSize="10"
                      fill="#A8988B"
                      fontFamily="monospace"
                    >
                      {valueLabel}
                    </text>
                  </g>
                );
              })}

              {/* Các Cột Doanh Thu */}
              {last7DaysData.map((day, idx) => {
                const xSlotCenter = 55 + idx * barSlotWidth + barSlotWidth / 2 - 5;
                const barX = xSlotCenter - barWidth / 2;
                const barHeight =
                  maxRevenue > 0
                    ? Math.max(6, (day.revenue / maxRevenue) * plotHeight)
                    : 6;
                const barY = paddingTop + plotHeight - barHeight;
                const isHovered = hoveredDayIndex === idx;

                return (
                  <g
                    key={day.dateStr}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setHoveredDayIndex(idx)}
                    onMouseLeave={() => setHoveredDayIndex(null)}
                  >
                    {/* Vùng cảm ứng hover rộng */}
                    <rect
                      x={xSlotCenter - barSlotWidth / 2}
                      y={paddingTop}
                      width={barSlotWidth}
                      height={plotHeight + paddingBottom}
                      fill={isHovered ? "rgba(158, 90, 43, 0.05)" : "transparent"}
                      rx="8"
                    />

                    {/* Cột chính */}
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx="6"
                      fill={day.isToday ? "url(#todayBarGradient)" : "url(#barGradient)"}
                      opacity={isHovered ? 1 : 0.9}
                      stroke={day.isToday ? "#B45309" : "#78350F"}
                      strokeWidth={isHovered ? "2" : "0.5"}
                    />

                    {/* Nhãn doanh thu trên đỉnh cột */}
                    <text
                      x={xSlotCenter}
                      y={barY - 7}
                      textAnchor="middle"
                      fontSize="10.5"
                      fontWeight="bold"
                      fill={day.isToday ? "#B45309" : "#2C1E18"}
                      fontFamily="monospace"
                    >
                      {day.revenue > 0
                        ? `${Math.round(day.revenue / 1000)}k`
                        : "0đ"}
                    </text>

                    {/* Nhãn Ngày & Thứ dưới chân cột */}
                    <text
                      x={xSlotCenter}
                      y={chartHeight - 20}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight={day.isToday ? "bold" : "600"}
                      fill={day.isToday ? "#D97706" : "#2C1E18"}
                    >
                      {day.dayOfWeek}
                    </text>
                    <text
                      x={xSlotCenter}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      fontSize="9.5"
                      fontWeight={day.isToday ? "bold" : "normal"}
                      fill={day.isToday ? "#B45309" : "#7A6A5E"}
                    >
                      {day.isToday ? "Hôm nay" : day.displayDate}
                    </text>

                    {/* Badge số đơn hàng dưới chân cột */}
                    {day.orderCount > 0 && (
                      <g>
                        <rect
                          x={xSlotCenter - 18}
                          y={barY + 6}
                          width="36"
                          height="16"
                          rx="4"
                          fill="rgba(255, 255, 255, 0.9)"
                        />
                        <text
                          x={xSlotCenter}
                          y={barY + 18}
                          textAnchor="middle"
                          fontSize="9"
                          fontWeight="bold"
                          fill="#78350F"
                        >
                          {day.orderCount} đơn
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Chi tiết tooltip hover */}
          <div className="mt-2 p-2.5 rounded-xl bg-[#FAF6F0] border border-[#E6DDD5] text-xs flex items-center justify-between">
            <span className="text-[#7A6A5E]">
              💡 <strong>Mẹo:</strong> Rê chuột vào từng cột để xem chi tiết doanh thu và đơn hàng mỗi ngày.
            </span>
            {hoveredDayIndex !== null && (
              <span className="font-bold text-[#2C1E18] font-mono">
                {last7DaysData[hoveredDayIndex].dayOfWeek} (
                {last7DaysData[hoveredDayIndex].displayDate}):{" "}
                <span className="text-[#9E5A2B]">
                  {last7DaysData[hoveredDayIndex].revenue.toLocaleString("vi-VN")}đ
                </span>{" "}
                • {last7DaysData[hoveredDayIndex].orderCount} đơn hàng
              </span>
            )}
          </div>
        </div>

        {/* CỘT 3: Biểu đồ tỷ lệ cơ cấu món theo danh mục */}
        <div className="bg-white rounded-2xl border border-[#E6DDD5] shadow-sm p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1 pb-3 border-b border-[#F0EAE3]">
              <span className="w-3 h-3 rounded-full bg-emerald-600" />
              <h2 className="font-headline text-base font-extrabold text-[#2C1E18]">
                🍩 Cơ Cấu Doanh Số Theo Nhóm Món
              </h2>
            </div>
            <p className="text-xs text-[#7A6A5E] mb-4">
              Tỷ trọng doanh thu đóng góp từ các danh mục sản phẩm
            </p>

            {/* Danh sách thanh tỷ lệ phần trăm */}
            <div className="space-y-4">
              {categoryStats.list.map((cat) => {
                const colors = CATEGORY_COLORS[cat.key] || {
                  bg: "bg-stone-100",
                  text: "text-stone-800",
                  bar: "bg-[#9E5A2B]",
                };

                return (
                  <div key={cat.key} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#2C1E18] flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${colors.bar}`} />
                        {cat.name}
                      </span>
                      <div className="text-right">
                        <span className="text-[#9E5A2B] font-mono">
                          {cat.revenue.toLocaleString("vi-VN")}đ
                        </span>
                        <span className="text-[#7A6A5E] font-normal ml-1.5">
                          ({cat.percent}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2.5 bg-[#F0E9E2] rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.max(cat.percent, cat.revenue > 0 ? 5 : 0)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#7A6A5E]">
                      <span>Đã phục vụ: <strong>{cat.quantity} ly</strong></span>
                      <span>{cat.percent}% tổng doanh thu</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F0EAE3] flex items-center justify-between text-xs font-bold text-[#2C1E18]">
            <span>Tổng Doanh Số Đồ Uống:</span>
            <span className="text-[#9E5A2B] font-mono text-sm">
              {categoryStats.totalCatRevenue.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

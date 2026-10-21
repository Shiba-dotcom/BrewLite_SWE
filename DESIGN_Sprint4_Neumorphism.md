# ☕ BrewLite — Warm Neumorphic Design System Specification
## Phân hệ Mở Rộng Sprint 4: Barista Kitchen Display System (KDS) & Admin ERP Portal

> **Dự án:** BrewLite — Nền Tảng Đặt & Thanh Toán Cà Phê Không Tiền Mặt  
> **Chủ đề thiết kế:** **Artisanal Warmth × Modern Soft Neumorphism**  
> **Nguyên tắc cốt lõi:** Tactile Clay Elevation • Subdued Warm Contrast • Dual Directional Lighting • High Ergonomics for Fast-Paced Operations  
> **Tài liệu liên kết:** [`DESIGN.md`](file:///d:/SWE/BrewLite_SWE/DESIGN.md) (Gốc), [`Planning_Sprint4_Extension.md`](file:///d:/SWE/BrewLite_SWE/Planning_Sprint4_Extension.md).

---

## 🎨 1. BẢNG MÃ MÀU & CÔNG THỨC ĐỔ BÓNG NỔI (NEUMORPHIC TOKENS)

Phong cách **Modern Soft Neumorphism** của BrewLite kết hợp tính chân thực của đồ đúc thủ công (Clay / Steamed Latte Foam) với ánh sáng xiên $45^\circ$, loại bỏ hoàn toàn cảm giác xám xịt của Neumorphism truyền thống để mang lại trải nghiệm ấm cúng, sang trọng và đạt chuẩn dễ đọc WCAG AA.

### 1.1. Bảng màu Nền & Bề mặt (Light Warm Clay Palette)

| Tên Token | Mã Hex / HSL | Ứng dụng & Chi tiết kỹ thuật |
| :--- | :--- | :--- |
| **Canvas Base** | `#F5EFEB` | Nền tổng thể của toàn bộ màn hình `/staff` và `/admin`. Sắc độ kem ấm ngăn ngừa lóa mắt trong ca làm việc dài. |
| **Surface Raised** | `#F8F2EE` | Bề mặt các khối đúc nổi: Thẻ đơn hàng (Order Card), Thẻ nguyên liệu (Bento Card), Sidebar. |
| **Surface Sunken** | `#EDE4DC` | Bề mặt các rãnh lõm: Ô nhập liệu (Input), Thanh đo tồn kho (Gauge Track), Vùng ghi chú Barista. |
| **Espresso Solid** | `#2C1810` | Nâu đậm cà phê rang mộc. Dùng cho Typography tiêu đề, icon định vị và trạng thái nút bấm hoàn tất. |
| **Amber Caramel** | `#C68B59` / `#845326` | Nâu hổ phách caramel. Dùng cho thẻ trạng thái Đang pha chế (`PREPARING`), rãnh tiến độ. |
| **Roasted Cinnamon**| `#D97736` | Cam quế nướng. Dùng cho cảnh báo đơn chờ lâu (> 5 phút), cảnh báo kho sắp hết hàng (`Yellow Alert`). |
| **Forest Sage** | `#2D6A4F` | Xanh rêu thảo mộc. Dùng cho thẻ Sẵn sàng nhận đồ (`READY`), cảnh báo tồn kho dồi dào (`Green Alert`). |
| **Crimson Roast** | `#991B1B` | Đỏ thẫm. Dùng cho cảnh báo kho cạn kiệt (`Red Alert = 0`), lỗi hủy đơn (`CANCELLED`). |

---

### 1.2. Công thức Đổ Bóng Kép (Dual Directional Shadow System)

Mọi phần tử Neumorphic trong BrewLite đều tuân theo nguồn sáng cố định từ **Góc Trên-Trái (Top-Left: $-135^\circ$)** chiếu xuống **Góc Dưới-Phải (Bottom-Right)**:

```css
/* ==========================================================================
   BREWLITE WARM NEUMORPHIC SHADOW FORMULAS
   ========================================================================== */

:root {
  /* 1. KHỐI ĐÚC NỔI MẶC ĐỊNH (Raised Surface - Dùng cho Card, Panel, Modal) */
  --neu-raised: 
    -5px -5px 12px rgba(255, 255, 255, 0.95),
     6px  6px 14px rgba(44, 24, 16, 0.08);

  /* 2. KHỐI ĐÚC NỔI NHẸ (Raised Soft - Dùng cho Badge, Nút bấm nhỏ) */
  --neu-raised-sm: 
    -3px -3px 8px rgba(255, 255, 255, 0.9),
     3px  3px 8px rgba(44, 24, 16, 0.06);

  /* 3. KHỐI ĐÚC NỔI CAO (Raised High - Dùng khi Hover hoặc Modal nổi) */
  --neu-raised-lg: 
    -8px -8px 20px rgba(255, 255, 255, 1),
     10px 10px 24px rgba(44, 24, 16, 0.12);

  /* 4. RÃNH KHẮC LÕM (Sunken Inset - Dùng cho Input, Thanh rãnh Gauge, Khung ghi chú) */
  --neu-sunken: 
    inset  3px  3px 6px rgba(44, 24, 16, 0.09),
    inset -3px -3px 6px rgba(255, 255, 255, 0.95);

  /* 5. NÚT NHẤN LÚN (Active / Pressed State - Phản hồi xúc giác khi Click) */
  --neu-pressed: 
    inset  4px  4px 8px rgba(44, 24, 16, 0.14),
    inset -4px -4px 8px rgba(255, 255, 255, 0.85);

  /* 6. GỜ NỔI CÓ MÀU NHŨ VÀNG (Accent Raised - Dùng cho Nút CTA chính) */
  --neu-accent-raised: 
    -4px -4px 10px rgba(255, 255, 255, 0.8),
     5px  5px 12px rgba(132, 83, 38, 0.25);
}
```

### 1.3. Tiện ích Tailwind CSS Tương Thích (Tailwind Preset Classes)
Trong file cấu hình Tailwind hoặc trực tiếp trong class component:
* **Khối nổi:** `shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),6px_6px_14px_rgba(44,24,16,0.08)] bg-[#F8F2EE]`
* **Rãnh lõm:** `shadow-[inset_3px_3px_6px_rgba(44,24,16,0.09),inset_-3px_-3px_6px_rgba(255,255,255,0.95)] bg-[#EDE4DC]`
* **Nút bấm phản hồi:** `active:shadow-[inset_4px_4px_8px_rgba(44,24,16,0.14),inset_-4px_-4px_8px_rgba(255,255,255,0.85)] transition-all duration-150`

---

## ☕ 2. PHÂN HỆ BARISTA KITCHEN DISPLAY SYSTEM (`/staff`)

Màn hình `/staff` được thiết kế tối ưu hóa cho màn hình cảm ứng POS hoặc iPad đặt tại quầy pha chế, thao tác nhanh bằng 1 ngón tay mà không cần dùng chuột hay bàn phím.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  [☕ BrewLite KDS]   🟢 Online (Ca 1)   🔔 Âm báo: Bật   ⏱️ 14:35:10    [Đăng xuất]   │
├──────────────────────────┬──────────────────────────┬──────────────────────────────────┤
│   CHỜ TIẾP NHẬN (PAID)   │  ĐANG PHA CHẾ (PREPARING)│   SẴN SÀNG NHẬN (READY)          │
│   ─── 3 Đơn hàng ───     │   ─── 2 Đơn hàng ───     │   ─── 4 Đơn hàng ───             │
├──────────────────────────┼──────────────────────────┼──────────────────────────────────┤
│  ┌────────────────────┐  │  ┌────────────────────┐  │  ┌────────────────────────────┐  │
│  │ #1042  ⏱️ 2m 15s   │  │  │ #1040  ⏱️ 5m 40s ⚠️│  │  │ #1038  ⏱️ Sẵn sàng (Quầy 1)│  │
│  │ 1x Cà phê Muối (M) │  │  │ 2x Bạc Xỉu (L)     │  │  │ 1x Matcha Latte (S)        │  │
│  │    [📖 Xem định lượng]│  │    [📖 Xem định lượng]│  │    Trân châu trắng         │  │
│  │ 1x Trà Đào Sả (L)  │  │  │ ┌────────────────┐ │  │  │                            │  │
│  │ ┌────────────────┐ │  │  │ │Ghi chú: Ít ngọt│ │  │  │ [ 🎉 ĐÃ GIAO NƯỚC ]         │  │
│  │ │Ghi chú: 50% Đá │ │  │  │ └────────────────┘ │  │  └────────────────────────────┘  │
│  │ └────────────────┘ │  │  │                    │  │                                  │
│  │ [ ☕ NHẬN PHA CHẾ ] │  │  │ [ ✅ HOÀN THÀNH ]  │  │                                  │
│  └────────────────────┘  │  └────────────────────┘  │                                  │
└──────────────────────────┴──────────────────────────┴──────────────────────────────────┘
```

### 2.1. Thanh Điều Khiển Đầu Trang (KDS Top Bar)
* **Chiều cao cố định:** `h-16 md:h-20`, nền `#F5EFEB` với rãnh viền dưới đúc lõm nhẹ.
* **Các thành phần tương tác:**
  1. **Logo & Tên trạm:** `BrewLite KDS • Quầy Barista Trung Tâm`.
  2. **Trạng thái trạm:** Đèn tín hiệu nhấp nháy êm `animate-pulse` màu xanh ngọc bích `bg-[#2D6A4F]`.
  3. **Đồng hồ thời gian thực:** Font số dạng Monospace (`font-mono text-base font-bold text-[#1D1B19]`), hiển thị chính xác giờ:phút:giây.
  4. **Nút Bật/Tắt Âm Báo Chuông (Audio Chime Toggle):**
     - Nút đúc nổi Neumorphic hình tròn (`w-11 h-11 rounded-full`).
     - Trạng thái Bật: Biểu tượng `notifications_active` màu cam caramel `#D97736`, phát tiếng chuông *Ting Ting* mỗi khi có đơn `PAID` mới.
     - Trạng thái Tắt: Biểu tượng `notifications_off` chìm lõm vào bề mặt.
  5. **Bộ lọc danh mục đồ uống:** Rãnh trượt xúc giác (sunken track) gồm 4 nút pill nổi: `Tất cả`, `Cà phê`, `Trà trái cây`, `Bánh ngọt`.

---

### 2.2. Thẻ Đơn Hàng Xúc Giác (Neumorphic Order Ticket)

Mỗi đơn hàng hiển thị dưới dạng một thẻ sứ đúc nổi nguyên khối (`bg-[#F8F2EE]`, bo góc `rounded-2xl`, bóng nổi `--neu-raised`).

#### Chi tiết cấu tạo Thẻ Đơn Hàng:
1. **Header Thẻ:**
   - **Mã đơn to nổi bật:** `#1042` hiển thị font Serif Playfair Display đậm (`font-serif text-xl font-bold text-[#2C1810]`).
   - **Đồng hồ đếm thời gian trôi qua (Elapsed Timer):**
     * Tự động đếm giây từ lúc khách thanh toán `PAID`.
     * *Thời gian < 4 phút:* Badge đúc lõm màu xanh lá mộc (`text-[#2D6A4F] bg-[#2D6A4F]/10`).
     * *Thời gian 4 – 7 phút:* Chuyển sang màu vàng cam hổ phách (`text-[#D97736] bg-[#D97736]/15`).
     * *Thời gian > 7 phút (Quá tải):* Nhấp nháy nhẹ màu đỏ thẫm (`text-[#991B1B] bg-[#991B1B]/20 animate-pulse`) nhắc nhở Barista ưu tiên pha gấp.
2. **Danh sách Món nước:**
   - Dòng món: `[Số lượng]x [Tên món] (Size S/M/L)`.
   - Chip Topping: Hiển thị dạng viên thuốc chìm lõm tinh tế (`bg-[#EDE4DC] text-[11px] font-semibold text-[#504440] rounded-md px-2 py-0.5`).
   - **Nút "Xem định lượng" (Quick Recipe Icon Button):**
     * Một biểu tượng sách công thức nhỏ `menu_book` đặt cạnh tên món.
     * Khi Barista chạm vào $\rightarrow$ Bật popup đúc nổi hiển thị chính xác định lượng cần đong (xem Mục 2.3).
3. **Khung Ghi Chú Barista (Customer Special Notes):**
   - Thiết kế dạng rãnh khắc lõm vào bề mặt thẻ (`--neu-sunken`, bo góc `rounded-xl`, padding `p-3`).
   - Nền màu kem nhạt `#EDE4DC`, chữ màu espresso đậm `#2C1810` in nghiêng kèm icon bút chì `stylus`: *"50% Đá, ít ngọt, nhiều bọt sữa"*.
4. **Nút Thao Tác Chuyển Trạng Thái 1-Chạm (Tactile Action CTA):**
   - Đặt ở đáy thẻ, bo tròn `rounded-xl`, chiều cao `h-12`.
   - **Cột Chờ (PAID) $\rightarrow$ Nút [Bắt đầu pha chế ☕]:** Nền cam caramel hổ phách, chữ trắng đậm. Khi nhấn có hiệu ứng lún lõm (`--neu-pressed`) tức thì.
   - **Cột Đang làm (PREPARING) $\rightarrow$ Nút [Đã pha xong ✅]:** Nền xanh rêu `#2D6A4F`, phát tín hiệu chuyển đơn sang cột READY.
   - **Cột Sẵn sàng (READY) $\rightarrow$ Nút [Đã giao khách 🎉]:** Nền espresso `#2C1810`, kết thúc vòng đời đơn hàng (`COMPLETED`).

---

### 2.3. Modal Xem Nhanh Định Lượng (Quick Recipe Popover)

Khi nhân viên mới hoặc pha chế chưa thuộc công thức chạm vào biểu tượng sách `menu_book`, một popover nổi bật giữa màn hình:

* **Phong cách:** Modal đúc nổi cao (`--neu-raised-lg`), nền `#F8F2EE`, bo góc `rounded-3xl`, viền ánh kim ấm `border border-[#C68B59]/30`.
* **Nội dung hiển thị:**
  * Tiêu đề: *Công thức pha chế — Cà Phê Muối (Size M - 350ml)*.
  * Bảng định lượng nguyên liệu đong chuẩn:
    * ☕ Cà phê Robusta mộc: **25g** (chiết xuất 50ml cốt).
    * 🥛 Sữa đặc Phương Nam: **35ml**.
    * 🍦 Kem béo Rich's Base: **45ml**.
    * 🧂 Muối biển hầm tinh khiết: **1.5g**.
  * Quy trình ngắn: *Khuấy tan sữa đặc và cà phê phin $\rightarrow$ Rót đá $70\%$ $\rightarrow$ Đánh bông kem muối béo và rót tầng mặt $\rightarrow$ Rắc nhẹ bột cacao nguyên chất.*

---

## 🛠️ 3. PHÂN HỆ QUẢN TRỊ VIÊN ADMIN (`/admin`)

Màn hình `/admin` là trung tâm điều hành kho hàng và định lượng BOM, bố trí theo cấu trúc Dashboard SaaS hiện đại với thanh Sidebar cố định bên trái và không gian Bento Grid bên phải.

```
┌──────────────┬────────────────────────────────────────────────────────────────────────┐
│  BREWLITE    │  📦 QUẢN LÝ KHO NGUYÊN VẬT LIỆU BOM         [+ Nhập kho nguyên liệu]  │
│  Roastery    │  Tổng: 12 Nguyên liệu  •  ⚠️ 2 Sắp hết  •  🔴 0 Hết hàng               │
│  ──────────  ├────────────────────────────────────────────────────────────────────────┤
│  📊 Tổng quan│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│              │  │ Hạt Cà Phê Robusta   │  │ Sữa Tươi Thanh Trùng │  │ Bột Matcha   │  │
│  📦 Kho hàng │  │ Tồn: 4,850g / 5,000g │  │ Tồn: 1,200ml / 15,000│  │ Tồn: 120g ⚠️ │  │
│              │  │ [████████████░░] 97% │  │ [█░░░░░░░░░░░░░] 8% ⚠️│  │ [██░░░░░] 12%│  │
│  📖 Công thức│  │ 🟢 Dồi dào           │  │ 🟡 Sắp hết hàng      │  │ 🟡 Cần nhập  │  │
│              │  │ [+ Nhập thêm kho]    │  │ [+ Nhập thêm kho]    │  │ [+ Nhập thêm]│  │
│  📈 Doanh thu│  └──────────────────────┘  └──────────────────────┘  └──────────────┘  │
│              │  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────┐  │
│  ⚙️ Cài đặt  │  │ Đào miếng ngâm       │  │ Cốt Trà Đen Ceylon   │  │ Trân Châu 3Q │  │
│  ──────────  │  │ Tồn: 180 lát         │  │ Tồn: 8,500ml         │  │ Tồn: 3,200g  │  │
│  [Đăng xuất] │  │ 🟢 Dồi dào           │  │ 🟢 Dồi dào           │  │ 🟢 Dồi dào   │  │
└──────────────┴────────────────────────────────────────────────────────────────────────┘
```

### 3.1. Sidebar Điều Hướng Đúc Nổi (Collapsible Neumorphic Sidebar)
* **Vị trí:** Cố định bên trái (`fixed left-0 top-0 bottom-0 w-64 md:w-72`), nền `#F5EFEB`, viền phân tách phải dạng gờ đổ bóng nhẹ.
* **Các mục điều hướng (Navigation Items):**
  1. `📊 Tổng quan Dashboard` (`/admin`)
  2. `📦 Kho Nguyên Vật Liệu` (`/admin/inventory`)
  3. `📖 Ma Trận Định Lượng Recipe` (`/admin/recipes`)
  4. `📈 Doanh Thu & Tiêu Hao` (`/admin/analytics`)
  5. `⚙️ Cài Đặt Hệ Thống` (`/admin/settings`)
* **Quy cách tương tác của từng Tab:**
  - **Trạng thái Chưa chọn (Inactive):** Phẳng mịn cùng màu nền, icon và chữ màu `#504440`, hover nổi nhẹ `--neu-raised-sm`.
  - **Trạng thái Đang chọn (Active):** Khối sứ đúc nổi rõ rệt (`--neu-raised`, bo góc `rounded-2xl`, chữ màu `#2C1810` đậm, viền chỉ vàng hổ phách bên trái `border-l-4 border-[#C68B59]`).

---

### 3.2. Lưới Thẻ Nguyên Liệu Bento (Inventory Bento Grid Cards)

Mỗi nguyên vật liệu trong kho được thể hiện như một khối đúc nổi độc lập (`w-full`, bo góc `rounded-2xl`, nền `#F8F2EE`, bóng `--neu-raised`).

#### Chi tiết trên từng Thẻ Nguyên Liệu:
1. **Phần Đầu Thẻ:**
   - Icon nguyên liệu đặc thù (Hạt cà phê, Bình sữa, Búp trà, Hộp phô mai).
   - Tên nguyên liệu: Font Plus Jakarta Sans đậm 15px (`font-bold text-[#1D1B19]`).
   - Mã nguyên liệu kỹ thuật: `ING_ROBUSTA` (dạng Monospace nhỏ `text-[10px] text-[#827470]`).
2. **Chỉ Số Tồn Kho Lớn (Big Stock Metric):**
   - Số lượng thực tế hiển thị to đậm: **4,850** kèm đơn vị tính **g** hoặc **ml**.
   - Mức an toàn tối thiểu (`minThreshold`): Hiển thị dạng chữ mờ bên cạnh: `/ 5,000g chuẩn`.
3. **Thanh Đo Rãnh Lõm Xúc Giác (Recessed Gauge Progress Bar):**
   - **Rãnh trượt (Track):** Rãnh khắc lõm sâu vào thẻ (`h-3.5 w-full rounded-full bg-[#EDE4DC] shadow-[inset_2px_2px_4px_rgba(44,24,16,0.1),inset_-2px_-2px_4px_rgba(255,255,255,0.9)]`).
   - **Thanh nạp màu (Fill Bar):** Bo tròn mềm mại, chuyển màu theo 3 cấp độ tồn kho:
     * 🟢 **Xanh lá cây (`#2D6A4F`):** Tồn kho $> minThreshold \times 1.5$ (Kho dồi dào, an toàn).
     * 🟡 **Vàng hổ phách (`#D97736`):** Tồn kho $\le minThreshold$ (Cảnh báo: sắp hết nguyên liệu pha chế).
     * 🔴 **Đỏ thẫm (`#991B1B`):** Tồn kho $= 0$ (Báo động: Đã cạn kiệt, tự động khóa món ngoài Menu).
4. **Nút Thao Tác Nhập Kho (+ Quick Restock CTA):**
   - Nút nhỏ gọn đặt ngay đáy thẻ (`h-9 px-4 rounded-xl text-xs font-bold text-[#845326] bg-[#F5EFEB] shadow-[-2px_-2px_5px_rgba(255,255,255,0.9),2px_2px_5px_rgba(44,24,16,0.08)] active:shadow-[inset_2px_2px_4px_rgba(44,24,16,0.1)]`).
   - Chạm vào $\rightarrow$ Mở Modal nhập thêm kho nhanh.

---

### 3.3. Modal Nhập Kho Xúc Giác (Restock Inflow Modal)

* **Thiết kế form:**
  * Hộp thoại trung tâm nổi `--neu-raised-lg`, nền `#F8F2EE`, bo góc `rounded-3xl`.
  * **Ô nhập số lượng (Quantity Input):** Rãnh khắc lõm sâu (`--neu-sunken`, chiều cao `h-14`, font số 24px đậm, căn giữa).
  * **Nút bấm tăng giảm nhanh (Quick Increment Steppers):** Các phím bấm tròn nổi xung quanh: `+500g`, `+1,000g`, `+2,000g`, `+5,000g`.
  * **Nút Xác nhận Nhập Kho:** Nút nhung nâu Espresso đậm `#2C1810` với chữ trắng, khi bấm kích hoạt animation lún nhẹ và thông báo toast thành công.

---

### 3.4. Bảng Ma Trận Định Lượng (Recipe Matrix View)

* **Bố cục:** Cho phép chọn giữa các tab món: `Cà phê`, `Trà`, `Đá xay`, `Topping`.
* **Cột kích thước Size tương tác (S / M / L Selector):**
  - Rãnh trượt xúc giác với tab chuyển đổi Size.
  - Khi chọn Size M $\rightarrow$ Tự động tính toán lượng tiêu hao và hiển thị tổng giá vốn nguyên liệu ước tính (COGS).
* **Định lượng Topping độc lập:** Bảng hiển thị rõ 4 Topping (`Trân châu`, `Kem muối`, `Thạch cafe`, `Shot espresso`) tiêu hao bao nhiêu nguyên liệu trong kho.

---

## 📐 4. HƯỚNG DẪN HIỆN THỰC BẰNG CODE (IMPLEMENTATION CHEATSHEET)

Dành cho lập trình viên Frontend khi triển khai giao diện Next.js & Tailwind CSS:

### 4.1. Cấu hình Tailwind `boxShadow` (Tùy chọn)
Trong file `tailwind.config.ts` hoặc CSS variables:
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      boxShadow: {
        'neu-flat': '-5px -5px 12px rgba(255,255,255,0.95), 6px 6px 14px rgba(44,24,16,0.08)',
        'neu-sm': '-3px -3px 8px rgba(255,255,255,0.9), 3px 3px 8px rgba(44,24,16,0.06)',
        'neu-lg': '-8px -8px 20px rgba(255,255,255,1), 10px 10px 24px rgba(44,24,16,0.12)',
        'neu-sunken': 'inset 3px 3px 6px rgba(44,24,16,0.09), inset -3px -3px 6px rgba(255,255,255,0.95)',
        'neu-pressed': 'inset 4px 4px 8px rgba(44,24,16,0.14), inset -4px -4px 8px rgba(255,255,255,0.85)',
      },
      colors: {
        'neu-bg': '#F5EFEB',
        'neu-surface': '#F8F2EE',
        'neu-recessed': '#EDE4DC',
      }
    }
  }
}
```

### 4.2. Snippet Code mẫu cho Card Đơn hàng Barista (JSX)
```tsx
export function BaristaOrderCard({ order, onTransition }: OrderCardProps) {
  return (
    <div className="bg-[#F8F2EE] rounded-2xl p-5 shadow-[-5px_-5px_12px_rgba(255,255,255,0.95),6px_6px_14px_rgba(44,24,16,0.08)] flex flex-col gap-4 border border-[#2C1810]/5 transition-all">
      {/* Header: ID + Timer */}
      <div className="flex items-center justify-between">
        <span className="font-serif text-2xl font-bold text-[#2C1810]">
          #{order.id}
        </span>
        <div className="px-3 py-1 rounded-full text-xs font-bold shadow-[inset_2px_2px_4px_rgba(44,24,16,0.08),inset_-2px_-2px_4px_rgba(255,255,255,0.9)] bg-[#EDE4DC] text-[#D97736]">
          ⏱️ {order.elapsedTime}
        </div>
      </div>

      {/* Items list */}
      <div className="space-y-2">
        {order.items.map((item) => (
          <div key={item.id} className="text-sm font-semibold text-[#1D1B19]">
            {item.quantity}x {item.productName} ({item.size})
            {item.toppings.length > 0 && (
              <span className="ml-2 text-[11px] text-[#504440] bg-[#EDE4DC] px-2 py-0.5 rounded-md shadow-inner">
                +{item.toppings.join(", ")}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Sunken Notes */}
      {order.notes && (
        <div className="bg-[#EDE4DC] p-3 rounded-xl shadow-[inset_2px_2px_5px_rgba(44,24,16,0.09),inset_-2px_-2px_5px_rgba(255,255,255,0.9)] text-xs text-[#2C1810] italic">
          ✍️ "{order.notes}"
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => onTransition(order.id)}
        className="w-full h-12 rounded-xl font-bold text-white bg-[#845326] shadow-[-3px_-3px_8px_rgba(255,255,255,0.8),4px_4px_10px_rgba(132,83,38,0.3)] active:shadow-[inset_3px_3px_6px_rgba(44,24,16,0.2)] transition-all flex items-center justify-center gap-2 cursor-pointer"
      >
        <span>Bắt đầu pha chế ☕</span>
      </button>
    </div>
  );
}
```

---

## 🏆 5. BẢNG TIÊU CHÍ NGHIỆM THU UI/UX (DOD THIẾT KẾ)

1. **Tính Nhất Quán Màu Sắc:** Giữ 100% tinh thần ấm áp *Artisanal Warmth* của thương hiệu cà phê mộc, không dùng nền xám kim loại công nghiệp.
2. **Hiệu Ứng Chiều Sâu Đúc Nổi (Tactile Feedback):** Nút bấm và thẻ có độ nổi tự nhiên; khi click chuột hoặc chạm ngón tay trên màn hình cảm ứng có cảm giác nhấn chìm (`active:shadow-inset`) chân thực.
3. **Độ Tương Phản Đạt Chuẩn (Accessibility):** Văn bản, mã đơn hàng và số liệu tồn kho đạt tỷ lệ tương phản $> 4.5:1$ so với nền bề mặt theo khuyến cáo WCAG AA.
4. **Khả Năng Thao Tác Một Chạm:** Kích thước vùng bấm tối thiểu đạt `48px × 48px`, khoảng cách giữa các thẻ tối thiểu `16px` giúp Barista thao tác nhanh chóng và chính xác tuyệt đối trong giờ cao điểm.

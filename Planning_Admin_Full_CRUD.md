# KẾ HOẠCH NÂNG CẤP TOÀN DIỆN CỔNG QUẢN TRỊ ADMIN (`/admin`) — FULL BUSINESS CRUD, PRICING, COGS & VOUCHERS

> **Dự án:** BrewLite — Hệ thống Đặt Nước & Thanh Toán Không Tiền Mặt  
> **Phạm vi nâng cấp toàn diện nghiệp vụ thực tế cho Quản trị viên (`Role.ADMIN`):**
> 1. **Quản lý Thực đơn, Giá bán, Mô tả & Giá Size (Menu & Size Pricing CRUD):**
>    - **Sửa nhanh trực tiếp (Quick Inline Edit)** ngay trên thẻ sản phẩm: Sửa nhanh Giá bán (`basePrice`), Giá phụ thu Size M / Size L riêng của món, và Mô tả hương vị (`description`) chỉ với 1 cú nhấp chuột.
>    - **Cấu hình Giá Size chuẩn toàn quán (`StoreSetting`):** Cho phép Admin điều chỉnh mức phụ thu mặc định của `Size S (+0đ)`, `Size M (+5.000đ)`, `Size L (+10.000đ)` áp dụng chung toàn quán, đồng thời cho phép ghi đè mức phụ thu Size M / L riêng trên từng món đặc biệt. Đồng bộ 100% sang `ProductDetailModal` bên trang khách hàng (`/menu`).
>    - Đầy đủ chức năng Xem, Thêm món mới, Sửa toàn diện (3 chế độ chọn ảnh), Ẩn/Hiện (`isActive`), Báo hết hàng thủ công (`isSoldOutManual`), và Xóa món kèm cảnh báo liên kết.
> 2. **Quản lý Topping & Giá Topping (Topping Full CRUD & Sync):**
>    - Cho phép Admin **Sửa giá bán Topping (`price`)**, Tên Topping (`toppingName`), Mô tả ngắn (`subtext`), Định lượng nguyên liệu tiêu hao (`amount`), Bật/Tắt hiển thị (`isActive`), **Thêm Topping mới** và **Xóa Topping**.
>    - Đồng bộ trực tiếp danh sách Topping đang mở bán và giá Topping mới nhất sang cửa sổ chọn món `ProductDetailModal` của khách hàng.
> 3. **Quản lý Giá nhập Nguyên vật liệu, Giá vốn (COGS), Lợi nhuận gộp & Nhật ký Nhập kho (`InventoryLog`):**
>    - Bổ sung **Đơn giá nhập (`costPerUnit`)** cho từng nguyên vật liệu trong kho. Hỗ trợ nhập 2 chiều thông minh: nhập theo **1 đơn vị (`g / ml / chiếc`)** hoặc nhập theo **1 Kg / 1 Lít (`1.000g / 1.000ml`)** tự động quy đổi qua lại.
>    - Tự động tính **Giá vốn (COGS)** của từng món theo công thức BOM ($\sum \text{Định lượng} \times \text{Đơn giá nhập}$) và hiển thị **Lợi nhuận gộp (`Giá bán - Giá vốn`)** cùng **Tỷ suất lợi nhuận (`Margin %`)** trên từng món và trên tổng doanh thu.
>    - Lưu **Nhật ký Nhập/Xuất Kho (`InventoryLog`)**: Ghi nhận mỗi lần Admin nhập hàng (`RESTOCK`) hoặc kiểm kê (`ADJUST`) tốn bao nhiêu chi phí (`totalCost`), số lượng trước/sau, ghi chú và người thực hiện.
> 4. **Quản lý Mã Giảm Giá / Khuyến Mãi (`DiscountCode` / Voucher CRUD):**
>    - Quản lý danh sách mã giảm giá trong Database (`code`, `description`, `discountPercent`, `minOrderAmount`, `isActive`).
>    - Admin có thể tạo mã mới (VD: `SUMMER25`), chỉnh `%` giảm, đơn tối thiểu, bật/tắt hoặc xóa mã. Đồng bộ trực tiếp với luồng áp dụng mã giảm giá ở Giỏ hàng (`/cart`) và `POST /orders`.
> 5. **Quản lý Đơn hàng & Doanh thu nâng cao:**
>    - Xem chi tiết hóa đơn, lọc theo trạng thái, chuyển trạng thái pha chế hoặc **Hủy đơn kèm hoàn trả nguyên vật liệu tự động**, và bảng xếp hạng **Top Món Bán Chạy Nhất**.

---

## 1. Kiến trúc Cơ sở dữ liệu mở rộng (`backend/prisma/schema.prisma`)

```prisma
model Product {
  id              Int      @id @default(autoincrement())
  name            String
  description     String?
  imageUrl        String?
  basePrice       Float
  sizeUpchargeM   Float?   // Nếu null sẽ dùng giá Size M chuẩn toàn quán (mặc định 5000)
  sizeUpchargeL   Float?   // Nếu null sẽ dùng giá Size L chuẩn toàn quán (mặc định 10000)
  category        String   @default("vietnamese")
  tag             String?  @default("Phổ biến")
  isActive        Boolean  @default(true)
  isSoldOutManual Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @default(now()) @updatedAt
  recipes         Recipe[]
}

model Ingredient {
  id             Int             @id @default(autoincrement())
  code           String          @unique
  name           String
  unit           String
  stock          Float           @default(0)
  minThreshold   Float           @default(100)
  costPerUnit    Float           @default(0) // Giá nhập trên 1 đơn vị (VNĐ / 1g, 1ml, 1 chiếc)
  version        Int             @default(0)
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  recipes        Recipe[]
  toppingRecipes ToppingRecipe[]
  logs           InventoryLog[]
}

model InventoryLog {
  id             Int        @id @default(autoincrement())
  ingredientId   Int
  action         String     @default("RESTOCK") // RESTOCK | ADJUST
  changeAmount   Float
  previousStock  Float
  newStock       Float
  unitCost       Float      @default(0)
  totalCost      Float      @default(0)
  note           String?
  performedBy    String?
  createdAt      DateTime   @default(now())
  ingredient     Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)
}

model ToppingRecipe {
  id           Int        @id @default(autoincrement())
  toppingCode  String
  toppingName  String
  subtext      String?    @default("Topping thơm ngon chuẩn vị")
  price        Float      @default(8000)
  isActive     Boolean    @default(true)
  ingredientId Int
  amount       Float
  ingredient   Ingredient @relation(fields: [ingredientId], references: [id], onDelete: Cascade)

  @@unique([toppingCode, ingredientId])
}

model StoreSetting {
  key         String   @id
  value       String
  description String?
  updatedAt   DateTime @default(now()) @updatedAt
}

model DiscountCode {
  id              Int      @id @default(autoincrement())
  code            String   @unique
  description     String?
  discountPercent Float    // VD: 10 (10%), 15 (15%), 20 (20%)
  minOrderAmount  Float    @default(0)
  isActive        Boolean  @default(true)
  usageCount      Int      @default(0)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @default(now()) @updatedAt
}
```

---

## 2. Thiết kế API Backend mở rộng

### 2.1. Phân hệ Sản phẩm & Cấu hình Giá Size (`ProductsController` / `InventoryController`)
- `PATCH /products/:id`: Hỗ trợ cập nhật `basePrice`, `description`, `sizeUpchargeM`, `sizeUpchargeL`, `name`, `category`, `tag`, `imageUrl`, `isActive`, `isSoldOutManual`.
- Tự động tính và trả về kèm mỗi sản phẩm:
  - `cogsSizeS`, `cogsSizeM`, `cogsSizeL`: Giá vốn nguyên liệu theo từng size dựa trên `Recipe.amount * Ingredient.costPerUnit`.
  - `grossProfitS`, `marginPercentS`: Lợi nhuận gộp và tỷ suất lợi nhuận `%` của món.
- `GET /inventory/pricing-config` (Public): Trả về cấu hình Giá Size chuẩn toàn quán (`sizeS: 0`, `sizeM: 5000`, `sizeL: 10000`), danh sách **Topping đang hoạt động** kèm `price`, `subtext`, `toppingId`, `toppingName`, và danh sách **Mã giảm giá (`DiscountCode`) đang mở** để trang `/menu` (`ProductDetailModal`) và trang `/cart` của khách hàng đồng bộ theo thời gian thực!
- `PATCH /inventory/size-pricing` (`ADMIN`): Cập nhật bảng Giá phụ thu Size chuẩn toàn quán (`sizeS`, `sizeM`, `sizeL`).

### 2.2. Phân hệ Topping Full CRUD (`InventoryController`)
- `POST /inventory/topping-recipes` (`ADMIN`): Tạo mới hoặc thêm thành phần nguyên liệu cho Topping kèm `price`, `subtext`, `isActive`.
- `PATCH /inventory/topping-recipes/:id` (`ADMIN`): Chỉnh sửa `price` (giá bán Topping), `toppingName`, `subtext`, `amount` (định lượng tiêu hao), `isActive` (ẩn/hiện Topping).
- `DELETE /inventory/topping-recipes/:id` (`ADMIN`): Xóa Topping.

### 2.3. Phân hệ Giá nhập Nguyên liệu & Nhật ký Kho (`InventoryController`)
- `POST /inventory/ingredients` & `PATCH /inventory/ingredients/:id`: Hỗ trợ cập nhật `costPerUnit` (đơn giá nhập).
- `PATCH /inventory/ingredients/:id/restock` & `PATCH /inventory/ingredients/:id/stock`: Nhận thêm `unitCost`, `totalCost`, `note` và tự động ghi vào bảng `InventoryLog`.
- `GET /inventory/logs` (`ADMIN`): Xem lịch sử nhập/xuất kho kèm tổng chi phí nhập hàng.

### 2.4. Phân hệ Quản lý Mã giảm giá / Voucher (`InventoryController` & `OrdersService`)
- `GET /inventory/vouchers` (Public/Admin): Lấy danh sách mã giảm giá.
- `POST /inventory/vouchers` (`ADMIN`): Tạo mã giảm giá mới (`code`, `description`, `discountPercent`, `minOrderAmount`, `isActive`).
- `PATCH /inventory/vouchers/:id` (`ADMIN`): Sửa thông tin `%` giảm, đơn tối thiểu, bật/tắt `isActive`.
- `DELETE /inventory/vouchers/:id` (`ADMIN`): Xóa mã giảm giá.
- Tích hợp vào `OrdersService.createOrder`: Tra cứu mã giảm giá từ bảng `DiscountCode` (kiểm tra `isActive` và `minOrderAmount`), cộng tăng `usageCount` khi khách áp mã thành công.

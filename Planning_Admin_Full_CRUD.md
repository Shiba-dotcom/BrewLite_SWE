# KẾ HOẠCH NÂNG CẤP TOÀN DIỆN CỔNG QUẢN TRỊ ADMIN (`/admin`) — FULL BUSINESS CRUD & OPERATIONS

> **Dự án:** BrewLite — Hệ thống Đặt Nước & Thanh Toán Không Tiền Mặt  
> **Phạm vi:** Nâng cấp toàn diện nghiệp vụ thực tế cho Quản trị viên (`Role.ADMIN`) bao gồm:
> 1. **Quản lý Thực đơn / Sản phẩm (Menu CRUD):** Xem, Thêm món mới, Chỉnh sửa (tên, mô tả, giá bán, danh mục, nhãn nổi bật, hình ảnh 3 chế độ), Ẩn/Hiện món (`isActive`), Báo hết hàng thủ công (`isSoldOutManual`), và Xóa món kèm hộp thoại cảnh báo liên kết.
> 2. **Quản lý Kho Nguyên Vật Liệu (Ingredient Full CRUD):** Thêm nguyên vật liệu mới, Sửa thông tin (tên, mã code, đơn vị tính, ngưỡng cảnh báo tối thiểu `minThreshold`, tồn kho `stock`), Nhập kho (`restock`), Kiểm kê (`set stock`), và Xóa nguyên vật liệu kèm cảnh báo số công thức ảnh hưởng.
> 3. **Quản lý Công thức Định lượng BOM (Recipe & Topping BOM Editor):** Điều chỉnh trực tiếp định lượng (`g / ml / phần`) cho từng Size (`S, M, L, ALL`) của từng sản phẩm, thêm/xóa nguyên liệu khỏi công thức món, chỉnh sửa định lượng Topping, và nút nhảy nhanh **"Cấu hình công thức"** từ thẻ sản phẩm sang trình thiết lập BOM.
> 4. **Quản lý Đơn hàng & Doanh thu nâng cao (Orders & Best-Sellers Analytics):** Xem chi tiết đơn hàng (món, size, topping, ghi chú, khách hàng), tìm kiếm & lọc đơn theo trạng thái, cho phép Admin chuyển trạng thái đơn (`PAID -> PREPARING -> READY -> COMPLETED`) hoặc **Hủy đơn (`CANCELLED`) kèm tự động hoàn trả nguyên vật liệu vào kho (Rollback Stock)**, và bảng xếp hạng **Top món bán chạy nhất (Best-sellers)**.

---

## 1. Kiến trúc Cơ sở dữ liệu (Prisma Schema & Migration)

Cập nhật model `Product` trong [`backend/prisma/schema.prisma`](file:///d:/SWE/BrewLite_SWE/BrewLite_SWE/backend/prisma/schema.prisma):

```prisma
model Product {
  id              Int      @id @default(autoincrement())
  name            String
  description     String?
  imageUrl        String?
  basePrice       Float
  category        String   @default("vietnamese") // vietnamese | espresso | tea | coldbrew | bakery
  tag             String?  @default("Phổ biến")   // Nhãn hiển thị góc ảnh (Đặc sản, Signature, Mới...)
  isActive        Boolean  @default(true)         // true: Hiện trên /menu | false: Ẩn khỏi /menu khách hàng
  isSoldOutManual Boolean  @default(false)        // true: Admin chủ động bật "Tạm hết hàng"
  createdAt       DateTime @default(now())
  updatedAt       DateTime @default(now()) @updatedAt
  recipes         Recipe[]
}
```

- **Tương thích ngược (Backward Compatibility):**
  - Mọi sản phẩm hiện có trong DB mặc định nhận `isActive = true`, `isSoldOutManual = false`, `category` và `tag` được đồng bộ chuẩn theo tên món.
  - Khi khách hàng gọi `GET /products`: chỉ trả về các món có `isActive = true`. Trường `isOutOfStock` trả về `true` nếu **nguyên liệu trong kho không đủ pha** HOẶC **`isSoldOutManual === true`**.
  - Khi Admin gọi `GET /products?includeInactive=true` (hoặc `GET /products/admin/all`): trả về toàn bộ sản phẩm (cả món đang hiển thị và món đang ẩn) kèm thống kê số lượng công thức BOM và số lần đã được đặt trong `OrderItem`.

---

## 2. Thiết kế API Backend (NestJS Controllers & Services)

### 2.1. Phân hệ Sản phẩm / Thực đơn (`ProductsController` & `ProductsService`)
Bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)` cho toàn bộ tác vụ ghi:

| Phương thức & Endpoint | Quyền | Chức năng chi tiết |
| :--- | :---: | :--- |
| `GET /products` | Public | Trả về danh sách món đang mở bán (`isActive: true`) cho trang `/menu` của khách hàng. Hỗ trợ query `?includeInactive=true` cho Admin. |
| `POST /products` | `ADMIN` | Tạo sản phẩm mới (`name`, `description`, `basePrice`, `imageUrl`, `category`, `tag`, `isActive`, `isSoldOutManual`). |
| `PATCH /products/:id` | `ADMIN` | Cập nhật thông tin sản phẩm (tên, mô tả, giá gốc, ảnh, danh mục, nhãn, trạng thái `isActive`, `isSoldOutManual`). |
| `PATCH /products/:id/visibility` | `ADMIN` | Bật/tắt nhanh công tắc **Ẩn/Hiện trên Menu (`isActive`)** hoặc **Báo hết hàng thủ công (`isSoldOutManual`)**. |
| `DELETE /products/:id` | `ADMIN` | Xóa sản phẩm khỏi DB (`Cascade` xóa các dòng `Recipe` của món đó; giữ nguyên lịch sử `OrderItem` cũ để bảo toàn báo cáo doanh thu). |

### 2.2. Phân hệ Nguyên vật liệu & Công thức BOM (`InventoryController` & `InventoryService`)
Bảo vệ bởi `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`:

| Phương thức & Endpoint | Quyền | Chức năng chi tiết |
| :--- | :---: | :--- |
| `POST /inventory/ingredients` | `ADMIN` | Thêm nguyên vật liệu mới (`code`, `name`, `unit`, `stock`, `minThreshold`). Kiểm tra trùng `code`. |
| `PATCH /inventory/ingredients/:id` | `ADMIN` | Chỉnh sửa thông tin nguyên vật liệu (`code`, `name`, `unit`, `minThreshold`, `stock`). |
| `DELETE /inventory/ingredients/:id` | `ADMIN` | Xóa nguyên vật liệu khỏi kho (`Cascade` xóa các dòng công thức liên quan). |
| `POST /inventory/recipes` | `ADMIN` | Thêm hoặc cập nhật (`upsert`) một dòng định lượng nguyên liệu cho Sản phẩm (`productId`, `ingredientId`, `size`, `amount`). |
| `PATCH /inventory/recipes/:id` | `ADMIN` | Điều chỉnh nhanh định lượng `amount` hoặc `size` của một dòng công thức BOM. |
| `DELETE /inventory/recipes/:id` | `ADMIN` | Xóa một nguyên liệu khỏi công thức của món. |
| `PATCH /inventory/topping-recipes/:id` | `ADMIN` | Điều chỉnh định lượng tiêu hao nguyên liệu của Topping. |
| `GET /inventory/dashboard` | `ADMIN`, `STAFF` | Mở rộng trả về thêm `topSellingProducts` (Top món bán chạy tính từ các đơn hợp lệ) và đầy đủ danh sách `recentOrders` kèm `items`. |

### 2.3. Phân hệ Quản lý Đơn hàng & Hoàn kho khi Hủy đơn (`OrdersService`)
- Khi Admin hoặc Staff chuyển trạng thái đơn hàng từ `PAID / PREPARING / READY` sang **`CANCELLED`** thông qua `PATCH /orders/:id/status`:
  - Hệ thống tự động tính toán lượng nguyên vật liệu đã trừ của đơn hàng đó (theo từng món + size + topping) và **hoàn trả lại (`increment`) vào tồn kho `Ingredient.stock`** trong cùng một Prisma Transaction để đảm bảo số liệu kho chính xác 100%.

---

## 3. Thiết kế Giao diện Cổng Quản Trị (`/admin`) — 5 Phân Hệ Chuyên Nghiệp

Bố cục Sidebar bên trái của `/admin` gồm **5 Tab nghiệp vụ**:

1. **Tổng Quan (`overview`):**
   - 4 thẻ KPI lớn: Tổng Doanh Thu Thực Nhận, Tổng Nguyên Liệu, Cảnh Báo Sắp Hết / Cạn Kho, Số Món Đang Mở Bán / Đang Ẩn.
   - Bảng cảnh báo nhanh nguyên liệu sắp cạn kèm nút **"Nhập kho ngay"**.
   - Bảng **Top Món Bán Chạy Nhất (Best-Sellers)** kèm số ly đã bán & doanh thu đóng góp.

2. **Quản Lý Thực Đơn (`products` — MỚI):**
   - Thanh công cụ: Tìm kiếm theo tên/mô tả, lọc theo Danh mục (`Tất cả`, `Cà phê Việt`, `Espresso`, `Trà & Matcha`, `Cold Brew`, `Bánh ngọt`), lọc theo trạng thái (`Đang hiện`, `Đang ẩn`, `Hết hàng`), và nút **"+ Thêm món mới"**.
   - Lưới thẻ Quản trị Sản phẩm:
     - Hiển thị ảnh món, nhãn `tag`, danh mục, giá bán, mô tả, số ly có thể pha (`availableServings`).
     - **2 công tắc (Toggle Switches) trực tiếp trên thẻ:**
       - 👁️ **Hiển thị trên Menu (`isActive`):** Bật/tắt tức thì (ẩn hoặc hiện món bên trang `/menu` của khách).
       - 🚫 **Báo hết hàng (`isSoldOutManual`):** Chủ động khóa đặt món (hiện nhãn Sold Out bên khách) ngay cả khi kho còn nguyên liệu.
     - **3 nút thao tác trên mỗi thẻ:**
       - ✏️ **Chỉnh sửa:** Mở Modal chỉnh sửa đầy đủ (Tên, Mô tả, Giá bán, Danh mục, Nhãn Tag, và Bộ chọn ảnh 3 chế độ: *Thư viện ảnh quán / Tải ảnh từ máy tính / Dán URL* kèm khung Live Preview).
       - 🧪 **Cấu hình BOM:** Nhảy thẳng sang Tab Định lượng BOM và mở ngay trình chỉnh sửa công thức của món đó.
       - 🗑️ **Xóa món:** Mở hộp thoại xác nhận cảnh báo số công thức BOM đi kèm trước khi xóa vĩnh viễn.

3. **Kho Nguyên Liệu (`inventory` — NÂNG CẤP FULL CRUD):**
   - Nút **"+ Thêm nguyên vật liệu mới"** trên góc phải.
   - Mỗi thẻ nguyên vật liệu trong Bento Grid có đầy đủ các nút:
     - **+ Nhập hàng (`restock`)**
     - **Kiểm kê (`set stock`)**
     - **✏️ Sửa thông tin (`edit`):** Đổi tên, mã code, đơn vị tính (`g, ml, phần`), và ngưỡng cảnh báo tối thiểu (`minThreshold`).
     - **🗑️ Xóa nguyên liệu (`delete`):** Có hộp thoại xác nhận cảnh báo số món đang dùng nguyên liệu này.

4. **Định Lượng BOM (`recipes` — NÂNG CẤP TRÌNH CHỈNH SỬA TRỰC TIẾP):**
   - Cho phép lọc xem công thức của từng món hoặc tất cả các món.
   - Trên mỗi món:
     - Sửa trực tiếp định lượng (`amount`) của từng nguyên liệu theo từng Size (`S`, `M`, `L`, `ALL`) và bấm lưu.
     - Nút **"+ Thêm nguyên liệu vào món"**: Chọn nguyên liệu từ kho, chọn Size (`S/M/L/ALL`), nhập định lượng tiêu hao.
     - Nút **🗑️ Xóa dòng nguyên liệu** khỏi công thức món.
   - Cho phép chỉnh sửa định lượng tiêu hao của 4 loại Topping ở bảng dưới.

5. **Doanh Thu & Đơn Hàng (`revenue` — NÂNG CẤP QUẢN TRỊ ĐƠN HÀNG):**
   - Bộ lọc trạng thái đơn hàng (`Tất cả`, `Chờ pha (PAID)`, `Đang pha (PREPARING)`, `Chờ lấy (READY)`, `Hoàn tất (COMPLETED)`, `Đã hủy (CANCELLED)`) và ô tìm kiếm theo mã đơn `#ID` hoặc tên/email khách.
   - Bảng danh sách đơn hàng:
     - Bấm **"Chi tiết"** để xem Modal hóa đơn đầy đủ (danh sách từng món, size, topping, đơn giá, giảm giá, thông tin khách hàng).
     - Cho phép Admin bấm chuyển trạng thái tiếp theo (`Bắt đầu pha`, `Báo có nước`, `Hoàn tất`) hoặc bấm **"Hủy đơn & Hoàn kho"** (kèm xác nhận).
   - Khối **Thống kê Top Món Bán Chạy Nhất** theo số lượng ly và doanh thu.

---

## 4. Kế hoạch Kiểm thử (Verification & Unit Tests)
1. **Unit Tests (Vitest):** Bổ sung unit test cho `ProductsService` (tạo, sửa, ẩn/hiện, xóa sản phẩm) và `InventoryService` (thêm/sửa/xóa nguyên liệu, thêm/sửa/xóa công thức BOM).
2. **Build & Docker:** Chạy `npx prisma migrate deploy`, build cả Backend & Frontend, cập nhật container Docker và push toàn bộ code lên nhánh `MaGiaVy-admin,customer`.

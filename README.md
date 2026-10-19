# BrewLite ☕ — Cashless Coffee Ordering System

Ứng dụng web đặt và thanh toán cà phê không dùng tiền mặt, xây dựng theo mô hình **Agile Scrum (Sprint 1 – Sprint 3)** với giao diện người dùng hiện đại, tối ưu trải nghiệm và tương thích đa thiết bị.

---

## 📑 Mục Lục
1. [Giới Thiệu Đồ Án](#-giới-thiệu-đồ-án)
2. [Công Nghệ Sử Dụng (Tech Stack)](#️-công-nghệ-sử-dụng-tech-stack)
3. [Cấu Trúc Thư Mục Dự Án](#-cấu-trúc-thư-mục-dự-án)
4. [Yêu Cầu Môi Trường (Prerequisites)](#-yêu-cầu-môi-trường-prerequisites)
5. [Hướng Dẫn Cài Đặt & Chạy Dự Án Từ Đầu Đến Cuối](#-hướng-dẫn-cài-đặt--chạy-dự-án-từ-đầu-đến-cuối)
   - [Bước 1: Tải mã nguồn từ GitHub](#bước-1-tải-mã-nguồn-từ-github)
   - [Cách 1: Khởi chạy siêu tốc bằng Docker Compose (Khuyên dùng)](#-cách-1-khởi-chạy-siêu-tốc-bằng-docker-compose-khuyên-dùng)
   - [Cách 2: Cài đặt và chạy Local thủ công](#-cách-2-cài-đặt-và-chạy-local-thủ-công-development-mode)
6. [Tài Khoản Thử Nghiệm & Kịch Bản Đánh Giá Luồng Đồ Án](#-tài-khoản-thử-nghiệm--kịch-bản-đánh-giá-luồng-đồ-án)
7. [Mã Giảm Giá (Vouchers) & Quy Tắc Tích Điểm Hạt Vàng](#-mã-giảm-giá-vouchers--quy-tắc-tích-điểm-hạt-vàng)
8. [Chạy Kiểm Thử Tự Động (Unit Tests)](#-chạy-kiểm-thử-tự-động-unit-tests)
9. [Danh Mục REST API Endpoints Chính](#-danh-mục-rest-api-endpoints-chính)
10. [Bảng Tiến Độ Agile Scrum (Sprint 1 – Sprint 3)](#-bảng-tiến-độ-agile-scrum-sprint-1--sprint-3)
11. [Xử Lý Lỗi Thường Gặp (Troubleshooting)](#-xử-lý-lỗi-thường-gặp-troubleshooting)

---

## ☕ Giới Thiệu Đồ Án

**BrewLite** là hệ thống gọi món cà phê và thanh toán không dùng tiền mặt (Cashless Coffee Ordering System). Hệ thống giải quyết bài toán xếp hàng chờ đợi tại quầy thanh toán, hỗ trợ:
- Khách hàng khám phá thực đơn đa dạng, tùy biến kích cỡ (S/M/L), lượng đá, độ ngọt và topping theo khẩu vị.
- Giỏ hàng trực quan, hỗ trợ áp dụng mã giảm giá ưu đãi.
- Đặt hàng và thanh toán điện tử không tiền mặt (MoMo, NAPAS, Visa/MasterCard, Apple Pay, Google Wallet).
- Chống thanh toán trùng lặp (Payment Idempotency) và giải quyết xung đột đồng thời (Optimistic Locking).
- Tích lũy điểm thành viên **Hạt Vàng** (1.000 VNĐ = 1 điểm) và quản lý thẻ thành viên, đổi ưu đãi qua slide-over Drawer tiện lợi.
- Quản lý trạng thái vòng đời đơn hàng chặt chẽ qua Finite State Machine (`PENDING → PAID → PREPARING → READY → COMPLETED`).

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

| Thành phần | Công nghệ | Phiên bản / Thư viện chính | Ghi chú |
|---|---|---|---|
| **Frontend** | Next.js (App Router, Turbopack) | React 19, TypeScript, TailwindCSS v4, Zustand | Giao diện hiện đại, trực quan, responsive |
| **Backend** | NestJS | TypeScript, REST API, Passport JWT, class-validator | Kiến trúc Modular, Dependency Injection |
| **Database & ORM** | PostgreSQL 16 & Prisma ORM | Prisma 6, Prisma Client, ACID Transactions | Quan hệ 1-N, N-N, Indexing, Optimistic Concurrency |
| **Payment Gateway** | Mock Payment Gateway Service | MoMo, NAPAS, Visa/MasterCard, Apple Pay, Google Wallet | Hỗ trợ cờ thử nghiệm lỗi `simulateFailure` |
| **Unit Testing** | Vitest | 40 unit test cases độc lập | Bao phủ toàn bộ luồng nghiệp vụ Backend |
| **Containerization** | Docker & Docker Compose | Multi-stage build | Đóng gói PostgreSQL, Backend và Frontend |

---

## 📂 Cấu Trúc Thư Mục Dự Án

```plaintext
BrewLite/
├── backend/                  # Mã nguồn NestJS Backend
│   ├── prisma/               # Schema Prisma & Migrations & Dữ liệu Seed mẫu
│   │   ├── migrations/       # Lịch sử các bản migration CSDL
│   │   ├── schema.prisma     # Định nghĩa các model CSDL
│   │   └── seed.ts           # Dữ liệu 10 món thực đơn mẫu & tài khoản demo
│   ├── src/
│   │   ├── auth/             # Module Đăng ký, Đăng nhập, JWT Guard, Profile (/auth/me)
│   │   ├── orders/           # Module Đặt đơn, State Machine Guard, Voucher Discount
│   │   ├── payments/         # Module Thanh toán, Idempotency, Optimistic Locking, Loyalty
│   │   ├── products/         # Module Danh mục thực đơn đồ uống & bánh
│   │   └── prisma/           # PrismaService dùng chung
│   ├── test/                 # 40 Unit Tests viết bằng Vitest
│   ├── .env.example          # Mẫu biến môi trường Backend
│   └── Dockerfile            # Multi-stage Dockerfile cho Backend
├── frontend/                 # Mã nguồn Next.js Frontend
│   ├── src/app/
│   │   ├── cart/             # Trang Giỏ hàng & Áp mã Voucher
│   │   ├── checkout/         # Trang Thanh toán không tiền mặt & Mock Payment
│   │   ├── login/            # Trang Đăng nhập
│   │   ├── register/         # Trang Đăng ký
│   │   ├── orders/           # Trang Lịch sử đơn hàng cá nhân
│   │   ├── order-confirmation/# Trang Hóa đơn điện tử (E-receipt) & QR code
│   │   ├── components/       # Header, LoyaltyDrawer, ProductDetailModal, Footer...
│   │   └── store/            # Quản lý State bằng Zustand (cartStore, authStore)
│   ├── .env.example          # Mẫu biến môi trường Frontend
│   └── Dockerfile            # Multi-stage Dockerfile cho Frontend
├── docker-compose.yml        # Điều phối khởi chạy toàn bộ 3 dịch vụ
├── Planning.md               # Kế hoạch Agile Scrum & tài liệu kỹ thuật chi tiết
└── README.md                 # Hướng dẫn cài đặt & vận hành dự án
```

---

## 📋 Yêu Cầu Môi Trường (Prerequisites)

Trước khi tiến hành cài đặt, đảm bảo thiết bị của bạn đã cài đặt các công cụ sau:

1. **Git**: Phiên bản bất kỳ (Kiểm tra bằng: `git --version`) — [Tải Git](https://git-scm.com/)
2. **Node.js**: Phiên bản **≥ 18.x** (Khuyên dùng LTS 20.x hoặc 22.x) — [Tải Node.js](https://nodejs.org/)
3. **npm**: Đi kèm với Node.js (phiên bản ≥ 9.x) (Kiểm tra bằng: `npm --version`)
4. **Docker Desktop** *(Khuyên dùng nếu muốn chạy nhanh bằng 1 lệnh)* — [Tải Docker Desktop](https://www.docker.com/products/docker-desktop/)
5. **PostgreSQL 16** *(Chỉ cần nếu bạn chọn Cách 2 - chạy local không dùng Docker)* — Cổng mặc định `5432`.

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Dự Án Từ Đầu Đến Cuối

### Bước 1: Tải mã nguồn từ GitHub

Mở **Terminal** (macOS/Linux) hoặc **PowerShell / Command Prompt** (Windows) và chạy:

```bash
# Clone repository về máy tính
git clone https://github.com/Shiba-dotcom/BrewLite_SWE.git

# Di chuyển vào thư mục dự án
cd BrewLite_SWE
```

Sau khi clone xong, bạn có thể lựa chọn một trong hai phương thức khởi chạy bên dưới:

---

### 🐳 CÁCH 1: Khởi Chạy Siêu Tốc Bằng Docker Compose (Khuyên Dùng)

> 💡 **Khuyên Dùng:** Phương thức này giúp bạn không cần cài đặt PostgreSQL riêng hay cấu hình biến môi trường thủ công. Tất cả dịch vụ được đồng bộ tự động trong các container cô lập.

#### 1. Khởi động các container:
Mở **Docker Desktop** trên máy, sau đó tại thư mục gốc `BrewLite_SWE` chạy lệnh:

```bash
docker compose up --build -d
```

Docker sẽ tự động:
- Khởi chạy CSDL **PostgreSQL 16** tại cổng `5432`.
- Khởi chạy **NestJS Backend** tại cổng `3001` và tự động áp dụng Prisma Migration.
- Khởi chạy **Next.js Frontend** tại cổng `3000`.

#### 2. Nạp dữ liệu mẫu (Seeding):
Chạy lệnh sau để nạp 10 món ăn/uống mẫu và tài khoản khách hàng demo vào Database bên trong Docker:

```bash
docker compose exec backend npx prisma db seed
```

#### 🌐 Địa chỉ truy cập các dịch vụ:
- **Giao diện người dùng (Frontend):** [http://localhost:3000](http://localhost:3000)
- **Hệ thống API (Backend):** [http://localhost:3001](http://localhost:3001)
- **Cơ sở dữ liệu (PostgreSQL):** `localhost:5432` *(User: `postgres` | Pass: `postgres` | DB: `brewlite`)*

#### Các lệnh quản lý Docker hữu ích:
```bash
# Xem log thời gian thực của cả 3 services:
docker compose logs -f

# Dừng toàn bộ hệ thống:
docker compose down

# Dừng và xóa sạch volume dữ liệu (nếu muốn làm mới CSDL từ đầu):
docker compose down -v
```

---

### 💻 CÁCH 2: Cài Đặt Và Chạy Local Thủ Công (Development Mode)

Phương thức này dành cho việc phát triển, kiểm thử trực tiếp mã nguồn với tính năng Hot-Reload.

#### Bước 2.1: Chuẩn bị Cơ sở dữ liệu PostgreSQL
- Đảm bảo PostgreSQL 16 đang chạy trên máy tính tại cổng `5432`.
- Tạo cơ sở dữ liệu có tên `brewlite` (nếu chưa có):
  ```sql
  CREATE DATABASE brewlite;
  ```

---

#### Bước 2.2: Cài đặt và Khởi chạy Backend (NestJS)

Mở **Terminal thứ nhất** tại thư mục gốc dự án:

```bash
# 1. Di chuyển vào thư mục backend
cd backend

# 2. Tạo file cấu hình môi trường .env từ file mẫu
# Đối với Linux/macOS hoặc Windows PowerShell:
cp .env.example .env
# (Hoặc Windows Command Prompt: copy .env.example .env)
```

Nội dung mặc định của `backend/.env`:
```env
PORT=3001
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/brewlite?schema=public"
JWT_SECRET="brewlite_secret_key"
```
*(Nếu tài khoản/mật khẩu PostgreSQL của bạn khác với `postgres:postgres`, hãy cập nhật chuỗi `DATABASE_URL` cho phù hợp).*

Tiếp tục chạy cài đặt thư viện và chuẩn bị dữ liệu:
```bash
# 3. Cài đặt các gói phụ thuộc
npm install

# 4. Sinh Prisma Client và đồng bộ cấu trúc bảng vào PostgreSQL
npx prisma migrate dev

# 5. Nạp dữ liệu mẫu (10 món thực đơn + tài khoản demo)
npx prisma db seed

# 6. Khởi chạy Backend ở chế độ tự động reload khi sửa code
npm run start:dev
```

> ✅ **Backend khởi động thành công tại:** **http://localhost:3001**

---

#### Bước 2.3: Cài đặt và Khởi chạy Frontend (Next.js)

Mở **Terminal thứ hai** tại thư mục gốc dự án:

```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Tạo file cấu hình môi trường .env.local từ file mẫu
# Đối với Linux/macOS hoặc Windows PowerShell:
cp .env.example .env.local
# (Hoặc Windows Command Prompt: copy .env.example .env.local)
```

Nội dung file `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

Tiếp tục cài đặt và khởi chạy:
```bash
# 3. Cài đặt các gói phụ thuộc
npm install

# 4. Khởi chạy Frontend với bộ tăng tốc Turbopack
npm run dev
```

> ✅ **Frontend khởi động thành công tại:** **http://localhost:3000**

---

## 🧪 Tài Khoản Thử Nghiệm & Kịch Bản Đánh Giá Luồng Đồ Án

### 1. Tài khoản thử nghiệm có sẵn trong hệ thống:
Sau khi chạy lệnh `prisma db seed`, hệ thống đã có sẵn tài khoản:

| Trường | Giá trị |
|---|---|
| **Email đăng nhập** | `test@example.com` |
| **Mật khẩu** | `password123` |
| **Tên hiển thị** | Khách hàng Demo |
| **Quyền** | Thành viên BrewLite Club |

> *Lưu ý: Bạn cũng có thể đăng ký tài khoản mới bất kỳ tại trang [http://localhost:3000/register](http://localhost:3000/register).*

### 2. Kịch bản trải nghiệm toàn trình từ A – Z:
1. **Duyệt Thực Đơn (`/`):** Xem danh mục Cà phê, Trà, Bánh nướng; tìm kiếm và lọc món.
2. **Tùy biến món:** Bấm vào một món (ví dụ: *Cà Phê Muối Hoàng Gia*) để mở Modal tuỳ chọn:
   - Đổi kích cỡ (Size S / M / L).
   - Chọn lượng đá (100% / 70% / 50% / Không đá), độ ngọt (100% / 50% / Không đường) và thêm topping (Kem muối, Trân châu trắng).
   - Bấm **"Thêm vào giỏ"**.
3. **Giỏ hàng (`/cart`):** Xem lại các món đã chọn, điều chỉnh số lượng. Nhập mã giảm giá (ví dụ: `BREWCOZY` hoặc `BREW10`) và bấm **"Áp dụng"**.
4. **Đăng nhập (`/login`):** Nhập email `test@example.com` / mật khẩu `password123`.
5. **Thanh toán (`/checkout`):**
   - Chọn phương thức: **MoMo Express**, **NAPAS 247**, **Thẻ Quốc Tế**, hoặc **Ví Điện Tử**.
   - Bấm **"Xác nhận thanh toán"**. Hệ thống gửi kèm `Idempotency-Key` bảo vệ chống trừ tiền hai lần và áp dụng Optimistic Locking.
6. **Hóa đơn điện tử (`/order-confirmation`):** Xem mã QR nhận món, mã định danh đơn hàng và số Hạt Vàng vừa tích lũy.
7. **Lịch sử đơn hàng (`/orders`):** Xem lại toàn bộ các đơn hàng đã đặt kèm trạng thái thực tế.
8. **Thẻ thành viên & Đổi ưu đãi (Drawer):** Bấm vào **Avatar** hoặc huy hiệu **⭐ X Hạt Vàng** ở góc phải thanh Header:
   - Xem số dư Hạt Vàng hiện tại.
   - Xem tiến trình tích lũy nâng hạng thẻ (Đồng → Bạc → Vàng → Kim Cương).
   - Đổi các mã ưu đãi độc quyền trực tiếp từ điểm tích lũy.

---

## 🎟️ Mã Giảm Giá (Vouchers) & Quy Tắc Tích Điểm Hạt Vàng

### 1. Danh sách mã giảm giá tích hợp sẵn:
| Mã Voucher | Tỷ lệ giảm | Điều kiện / Mô tả |
|---|---|---|
| **`BREWCOZY`** | **-15%** | Ưu đãi đặc quyền dành cho thành viên thân thiết BrewLite |
| **`BREW10`** | **-10%** | Đổi bằng 20 Hạt Vàng trên Thẻ thành viên Drawer |
| **`BREW20`** | **-20%** | Ưu đãi sự kiện đặc biệt |

### 2. Quy tắc tích điểm Hạt Vàng (Loyalty Points):
- **Tỷ lệ quy đổi chuẩn hóa:** **1.000 VNĐ = 1 điểm Hạt Vàng** (áp dụng nhất quán trên toàn bộ Frontend và Backend).
- **Cơ chế cộng điểm:** Khi đơn hàng hoàn tất thanh toán (trạng thái `PAID`), Backend tự động tính số điểm thưởng và cộng dồn vào trường `loyaltyPoints` của người dùng ngay trong cùng một Prisma Database Transaction.
- **Bảo mật:** Toàn bộ việc tính giảm giá voucher và điểm thưởng đều do Server xử lý độc lập, ngăn chặn gian lận thay đổi giá trị từ Client.

---

## 🔬 Chạy Kiểm Thử Tự Động (Unit Tests)

Hệ thống được trang bị bộ kiểm thử tự động toàn diện viết bằng **Vitest** với **40/40 test cases** đều vượt qua (100% Passed):

```bash
# Di chuyển vào thư mục backend và chạy test:
cd backend
npm test
```

### Các nhóm nghiệp vụ được kiểm thử tự động:
1. **Order Finite State Machine Guard:** Kiểm thử ma trận chuyển trạng thái hợp lệ (`PENDING → PAID → PREPARING → READY → COMPLETED`) và chặn các hành vi chuyển trạng thái sai hoặc can thiệp đơn đã kết thúc (`CANCELLED`, `COMPLETED`).
2. **Payment Idempotency Control:** Kiểm thử chống trùng lặp thanh toán khi gửi cùng một `Idempotency-Key`, kiểm thử cho phép thử lại nếu giao dịch trước đó thất bại (`FAILED`).
3. **Optimistic Concurrency Control:** Giả lập 2 request thanh toán gửi tới đồng thời cho cùng một đơn hàng, kiểm tra hệ thống phát hiện xung đột phiên bản `version` và trả về `409 ConflictException`.
4. **Loyalty Points Accumulation:** Kiểm thử tính đúng số Hạt Vàng được tích lũy sau khi thanh toán thành công, kiểm thử bỏ qua đơn khách vãng lai hoặc đơn không hợp lệ.
5. **Voucher Discount Calculation:** Kiểm thử tính toán trừ phần trăm cho các mã `BREW10`, `BREWCOZY`, `BREW20` và từ chối mã không tồn tại.

---

## 📡 Danh Mục REST API Endpoints Chính

| Module | Method | Endpoint | Mô tả chức năng | Xác thực |
|---|---|---|---|:---:|
| **Auth** | `POST` | `/auth/register` | Đăng ký tài khoản mới (mã hóa mật khẩu bằng bcrypt) | Công khai |
| **Auth** | `POST` | `/auth/login` | Đăng nhập hệ thống, cấp Bearer JWT token | Công khai |
| **Auth** | `GET` | `/auth/me` | Lấy thông tin tài khoản kèm số dư Hạt Vàng thực tế | ✅ Bearer JWT |
| **Products**| `GET` | `/products` | Lấy danh sách thực đơn đồ uống & bánh nướng | Công khai |
| **Products**| `GET` | `/products/:id` | Lấy thông tin chi tiết một sản phẩm theo ID | Công khai |
| **Orders** | `POST` | `/orders` | Đặt đơn hàng mới (tính tổng tiền server-side, áp mã voucher) | ✅ Bearer JWT |
| **Orders** | `GET` | `/orders/me` | Lấy danh sách lịch sử đơn hàng của người dùng đăng nhập | ✅ Bearer JWT |
| **Orders** | `GET` | `/orders/:id` | Xem chi tiết đơn hàng (kiểm tra quyền sở hữu chống IDOR) | ✅ Bearer JWT |
| **Orders** | `PATCH`| `/orders/:id/status`| Cập nhật trạng thái đơn hàng (kiểm tra State Machine) | ✅ Bearer JWT |
| **Payments**| `POST` | `/payments` | Xử lý thanh toán (kiểm tra Idempotency & Optimistic Locking) | ✅ Bearer JWT |

---

## 📊 Bảng Tiến Độ Agile Scrum (Sprint 1 – Sprint 3)

Dự án đã hoàn thành **100%** toàn bộ 10 nhiệm vụ trong cả 3 Sprints:

- **Sprint 1 (Nền tảng & Hiển thị Thực Đơn):**
  - [x] **Task 1:** Khởi tạo cấu trúc Monorepo Next.js + NestJS, Docker Compose, Git workflow và tài liệu kỹ thuật.
  - [x] **Task 2:** Thiết kế CSDL PostgreSQL, cấu hình Prisma ORM và xây dựng API `GET /products`.
  - [x] **Task 3:** Xây dựng giao diện Menu hiển thị lưới sản phẩm, thanh tìm kiếm và bộ lọc danh mục.
  - [x] **Task 4:** Modal chi tiết món, hỗ trợ tùy biến size (S/M/L), độ ngọt, lượng đá và topping.

- **Sprint 2 (Giỏ Hàng, Đặt Đơn & Xác Thực):**
  - [x] **Task 5:** Quản lý giỏ hàng phía Client bằng Zustand (thêm/sửa/xóa món, huy hiệu giỏ hàng).
  - [x] **Task 6:** API `POST /orders` tạo đơn hàng lưu trạng thái ban đầu `PENDING`.
  - [x] **Task 7:** Hệ thống Đăng ký / Đăng nhập với Passport JWT, bảo vệ các endpoint đặt đơn hàng.

- **Sprint 3 (Thanh Toán Không Tiền Mặt, Bàn Giao & Nghiệp Vụ Nâng Cao):**
  - [x] **Task 8:** Thanh toán không tiền mặt tích hợp Mock Payment Gateway, cờ `simulateFailure`.
  - [x] **Task 9:** Màn hình xác nhận đơn hàng, hóa đơn điện tử e-receipt, lịch sử `GET /orders/me` và Dockerfile đa tầng.
  - [x] **Task 10:** Nghiệp vụ Backend nâng cao & Thẻ thành viên Drawer:
    - Finite State Machine Guard (`assertTransition`) & route `PATCH /orders/:id/status`.
    - Kiểm soát xung đột đồng thời với Optimistic Locking (`version` column).
    - Payment Idempotency Key bảo vệ giao dịch thanh toán trùng lặp.
    - Hệ thống tích lũy điểm thưởng Hạt Vàng & Thẻ thành viên Drawer trực quan, sinh động.
    - Xử lý mã giảm giá Voucher (`BREW10`, `BREWCOZY`, `BREW20`) an toàn phía máy chủ.

---

## 🔧 Xử Lý Lỗi Thường Gặp (Troubleshooting)

### 1. Trùng cổng (Port already in use - 3000, 3001 hoặc 5432)
- **Hiện tượng:** Báo lỗi `EADDRINUSE: address already in use :::3000` hoặc `:::3001`.
- **Cách khắc phục:**
  - Kiểm tra và tắt các tiến trình đang chiếm dụng cổng:
    ```bash
    # Trên Windows (PowerShell):
    Get-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess | Stop-Process
    # Trên macOS/Linux:
    lsof -ti:3001 | xargs kill -9
    ```

### 2. Lỗi kết nối CSDL PostgreSQL (`P1001: Can't reach database server`)
- **Cách khắc phục:**
  - Nếu chạy Docker: Đảm bảo Docker Desktop đã được bật và container `brewlite_db` đang chạy ở trạng thái `healthy`.
  - Nếu chạy Local: Kiểm tra dịch vụ PostgreSQL service đã được start trong `services.msc` (Windows) hoặc `brew services start postgresql` (macOS).
  - Kiểm tra lại chuỗi `DATABASE_URL` trong file `backend/.env` xem user/password có đúng hay không.

### 3. Prisma Client chưa được tạo (`@prisma/client did not initialize yet`)
- **Cách khắc phục:**
  ```bash
  cd backend
  npx prisma generate
  ```

### 4. Giao diện Frontend hiển thị chưa có món nào sau khi chạy Docker
- **Hiện tượng:** Truy cập [http://localhost:3000](http://localhost:3000) nhưng danh sách thực đơn rỗng.
- **Cách khắc phục:** Chạy lệnh nạp dữ liệu mẫu vào container:
  ```bash
  docker compose exec backend npx prisma db seed
  ```

---

*Dự án được xây dựng và hoàn thiện với đầy đủ tiêu chuẩn kỹ thuật phần mềm, mã nguồn sạch, kiểm thử tự động và tài liệu chi tiết.* ☕
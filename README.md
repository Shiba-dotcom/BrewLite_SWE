# BrewLite ☕

Ứng dụng đặt và thanh toán đồ uống không dùng tiền mặt — xây dựng theo mô hình Agile Scrum (Sprint 1–3).

## Tech Stack

| Layer | Công nghệ |
|---|---|
| **Frontend** | Next.js 15 (TypeScript, TailwindCSS, Zustand) |
| **Backend** | NestJS (TypeScript, REST API, Passport JWT) |
| **Database** | PostgreSQL 16 + Prisma ORM |
| **Payment** | Mock Payment Service (mô phỏng VietQR/Visa & Master Card/ Apple Pay, GooglePay) |
| **DevOps** | Docker Compose (3 service) |

---

## 🐳 Chạy toàn bộ hệ thống bằng Docker (khuyên dùng)

> Yêu cầu: [Docker Desktop](https://www.docker.com/products/docker-desktop/) đang chạy

```bash
# Từ thư mục gốc BrewLite/
docker compose up --build
```

Sau khi khởi động xong:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **PostgreSQL**: localhost:5432

Để dừng:
```bash
docker compose down
```

Để xóa cả dữ liệu database:
```bash
docker compose down -v
```

---

## 💻 Chạy local (Development)

### Yêu cầu
- Node.js ≥ 18
- PostgreSQL đang chạy tại `localhost:5432`

### Backend

```bash
cd backend
cp .env.example .env   # Điền DATABASE_URL và JWT_SECRET vào .env
npm install
npx prisma migrate dev
npm run start:dev
```

API chạy tại: http://localhost:3001

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App chạy tại: http://localhost:3000

---

## 📡 API Endpoints chính

| Method | Endpoint | Mô tả | Auth |
|---|---|---|---|
| `GET` | `/products` | Danh sách sản phẩm | ❌ |
| `GET` | `/products/:id` | Chi tiết sản phẩm | ❌ |
| `POST` | `/auth/register` | Đăng ký tài khoản | ❌ |
| `POST` | `/auth/login` | Đăng nhập, nhận JWT | ❌ |
| `POST` | `/orders` | Tạo đơn hàng | ✅ JWT |
| `GET` | `/orders/me` | Lịch sử đơn hàng của tôi | ✅ JWT |
| `GET` | `/orders/:id` | Chi tiết đơn hàng | ✅ JWT |
| `POST` | `/payments` | Thanh toán mock | ✅ JWT |

---

## 🧪 Tài khoản test

Sau khi chạy seed hoặc đăng ký tại `/login`:

```
Email: test@example.com
Password: password123
```

---

## 📋 Task Backlog (Agile Scrum)

| Task | Mô tả | Sprint |
|---|---|---|
| ✅ Task 1 | Khởi tạo monorepo | Sprint 1 |
| ✅ Task 2 | API danh sách sản phẩm | Sprint 1 |
| ✅ Task 3 | Trang Menu (Frontend) | Sprint 1 |
| ✅ Task 4 | Chi tiết và tùy chọn sản phẩm | Sprint 1 |
| ✅ Task 5 | Giỏ hàng (Cart + Zustand) | Sprint 2 |
| ✅ Task 6 | API tạo đơn hàng | Sprint 2 |
| ✅ Task 7 | Đăng ký / Đăng nhập (JWT) | Sprint 2 |
| ✅ Task 8 | Thanh toán Mock Payment | Sprint 3 |
| ✅ Task 9 | Xác nhận, lịch sử đơn & bàn giao | Sprint 3 |
| 🔄 Task 10 | Nghiệp vụ backend nâng cao | Sprint 3 |
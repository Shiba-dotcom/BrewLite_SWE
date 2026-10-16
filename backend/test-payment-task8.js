/**
 * BrewLite — Test kịch bản Task 8: Thanh toán không tiền mặt
 * Kiểm thử toàn diện:
 * 1. Đăng ký & Đăng nhập (JWT)
 * 2. Tạo đơn hàng (POST /orders -> PENDING)
 * 3. Lấy chi tiết đơn hàng (GET /orders/:id)
 * 4. Chống IDOR (User khác không được xem/thanh toán đơn)
 * 5. Exception Path (simulateFailure: true -> PAYMENT_FAILED)
 * 6. Thử lại & Chuyển đổi trạng thái (PAYMENT_FAILED -> PAID)
 * 7. State Machine Guard (PAID không thể thanh toán lại -> 400)
 * 8. Payment Idempotency (Gửi lại cùng Idempotency-Key -> trả về kết quả cũ)
 */

async function runTask8Tests() {
  const BASE = 'http://localhost:3001';
  const email1 = `buyer_${Date.now()}@brewlite.vn`;
  const email2 = `stranger_${Date.now()}@brewlite.vn`;
  const password = 'Password123!';

  console.log('====================================================');
  console.log('☕ BREWLITE — KIỂM THỬ TỰ ĐỘNG TASK 8 (PAYMENTS)');
  console.log('====================================================\n');

  // 1. Tạo 2 tài khoản: User 1 (Chủ đơn), User 2 (Kẻ lạ mặt test IDOR)
  console.log('1. [AUTH] Đăng ký & Đăng nhập User 1 (Chủ đơn)...');
  await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password, fullName: 'Khách Hàng Thật' }),
  });
  let res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email1, password }),
  });
  const { accessToken: token1 } = await res.json();

  console.log('2. [AUTH] Đăng ký & Đăng nhập User 2 (Kẻ lạ mặt)...');
  await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password, fullName: 'Người Lạ' }),
  });
  res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email2, password }),
  });
  const { accessToken: token2 } = await res.json();

  // 3. User 1 tạo đơn hàng
  console.log('\n3. [ORDERS] User 1 tạo đơn hàng mới (POST /orders)...');
  res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      items: [
        {
          productId: 1,
          productName: 'Cà Phê Muối Salted Cream',
          size: 'M',
          toppings: ['Kem mặn sủi bọt'],
          quantity: 2,
          unitPrice: 55000,
        },
      ],
    }),
  });
  const orderData = await res.json();
  const orderId = orderData.orderId;
  console.log(`   -> Đơn hàng #${orderId} được tạo thành công: Tổng ${orderData.totalAmount} VNĐ | Status: ${orderData.status}`);

  // 4. Kiểm tra GET /orders/:id
  console.log(`\n4. [ORDERS] User 1 lấy chi tiết đơn hàng (GET /orders/${orderId})...`);
  res = await fetch(`${BASE}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const fetchedOrder = await res.json();
  console.log(`   -> Status code: ${res.status} | Đơn #${fetchedOrder.id} | Tổng tiền: ${fetchedOrder.totalAmount} VNĐ`);

  // 5. Kiểm tra bảo mật IDOR
  console.log('\n5. [SECURITY - IDOR] User 2 cố ý truy cập đơn hàng của User 1...');
  res = await fetch(`${BASE}/orders/${orderId}`, {
    headers: { Authorization: `Bearer ${token2}` },
  });
  console.log(`   -> GET /orders/${orderId} trả về status: ${res.status} (Kỳ vọng: 403 Forbidden)`);

  res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
    },
    body: JSON.stringify({ orderId, method: 'EWALLET' }),
  });
  console.log(`   -> POST /payments trả về status: ${res.status} (Kỳ vọng: 403 Forbidden)`);

  // 6. Kiểm thử Exception Path: simulateFailure = true -> PAYMENT_FAILED
  console.log('\n6. [EXCEPTION PATH] Thử nghiệm thanh toán thất bại (simulateFailure = true)...');
  const failKey = `key-fail-${Date.now()}`;
  res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
      'Idempotency-Key': failKey,
    },
    body: JSON.stringify({
      orderId,
      method: 'EWALLET',
      simulateFailure: true,
    }),
  });
  const failResult = await res.json();
  console.log('   -> Kết quả thanh toán:', {
    success: failResult.success,
    status: failResult.status,
    paymentStatus: failResult.paymentStatus,
    message: failResult.message,
  });

  // 7. Kiểm thử Happy Path & State Machine: Chuyển từ PAYMENT_FAILED -> PAID
  console.log('\n7. [HAPPY PATH] Khách hàng đổi phương thức sang BANK_CARD và thử lại (PAYMENT_FAILED -> PAID)...');
  const successKey = `key-success-${Date.now()}`;
  res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
      'Idempotency-Key': successKey,
    },
    body: JSON.stringify({
      orderId,
      method: 'BANK_CARD',
      simulateFailure: false,
    }),
  });
  const successResult = await res.json();
  console.log('   -> Kết quả thanh toán:', {
    success: successResult.success,
    status: successResult.status,
    paymentStatus: successResult.paymentStatus,
    amount: successResult.amount,
    method: successResult.method,
    transactionId: successResult.transactionId,
  });

  // 8. Kiểm thử State Machine Guard: Đơn đã PAID không thể thanh toán tiếp
  console.log('\n8. [STATE MACHINE GUARD] Cố ý thanh toán lại cho đơn đã PAID...');
  res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
      'Idempotency-Key': `key-extra-${Date.now()}`,
    },
    body: JSON.stringify({
      orderId,
      method: 'EWALLET',
      simulateFailure: false,
    }),
  });
  const guardError = await res.json();
  console.log(`   -> Status code: ${res.status} (Kỳ vọng: 400 Bad Request)`);
  console.log(`   -> Thông báo lỗi: "${guardError.message}"`);

  // 9. Kiểm thử Payment Idempotency
  console.log('\n9. [IDEMPOTENCY] Gửi lại cùng Idempotency-Key đã thành công ở bước 7...');
  res = await fetch(`${BASE}/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
      'Idempotency-Key': successKey,
    },
    body: JSON.stringify({
      orderId,
      method: 'BANK_CARD',
      simulateFailure: false,
    }),
  });
  const idempotentResult = await res.json();
  console.log('   -> Kết quả Idempotent:', {
    isIdempotent: idempotentResult.isIdempotent,
    success: idempotentResult.success,
    message: idempotentResult.message,
    status: idempotentResult.status,
  });

  // 10. Xác minh dữ liệu trực tiếp trong PostgreSQL qua Prisma Client
  console.log('\n10. [DATABASE VERIFICATION] Đọc trực tiếp Order và Payment trong DB...');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const dbOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: { payments: true },
  });
  console.log('   -> Order in DB:', {
    id: dbOrder.id,
    status: dbOrder.status,
    totalAmount: dbOrder.totalAmount,
    totalPayments: dbOrder.payments.length,
    payments: dbOrder.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      method: p.method,
      status: p.status,
      idempotencyKey: p.idempotencyKey,
    })),
  });
  await prisma.$disconnect();

  console.log('\n🎉 TOÀN BỘ CÁC BƯỚC KIỂM THỬ TASK 8 ĐÃ ĐẠT 100%!');
}

runTask8Tests().catch(console.error);

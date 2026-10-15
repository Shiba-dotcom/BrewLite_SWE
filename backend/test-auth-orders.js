async function test() {
  const BASE = 'http://localhost:3001';
  const email = `user_${Date.now()}@brewlite.vn`;
  const password = 'Password123!';

  console.log('--- TEST 1: POST /auth/register (New User) ---');
  let res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: 'Nguyễn Văn Test',
      phone: '0901234567',
    }),
  });
  let data = await res.json();
  console.log(`Status: ${res.status}`, data);

  console.log('\n--- TEST 2: POST /auth/register (Duplicate Email -> 409) ---');
  res = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      fullName: 'Nguyễn Văn Test',
      phone: '0901234567',
    }),
  });
  data = await res.json();
  console.log(`Status: ${res.status} (Expected 409)`, data);

  console.log('\n--- TEST 3: POST /auth/login (Correct Credentials) ---');
  res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  data = await res.json();
  console.log(`Status: ${res.status}`, data);
  const token = data.accessToken;

  console.log('\n--- TEST 4: POST /orders WITHOUT Token (Should be 401) ---');
  res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      note: 'Test không token',
      items: [{ productId: 1, quantity: 1, unitPrice: 45000 }],
    }),
  });
  data = await res.json();
  console.log(`Status: ${res.status} (Expected 401)`, data);

  console.log('\n--- TEST 5: POST /orders WITH Bearer Token (Should be 201) ---');
  res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      items: [
        {
          productId: 1,
          productName: 'Cà Phê Sữa Đá',
          size: 'M',
          toppings: ['Trân châu đen'],
          quantity: 2,
          unitPrice: 45000,
        },
      ],
    }),
  });
  data = await res.json();
  console.log(`Status: ${res.status} (Expected 201)`, data);

  console.log('\n--- TEST 6: VERIFY ORDER IN POSTGRESQL DB ---');
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  const dbOrder = await prisma.order.findUnique({
    where: { id: data.orderId },
    include: { user: true, items: true },
  });
  console.log('Order in DB:', {
    id: dbOrder.id,
    userId: dbOrder.userId,
    userEmail: dbOrder.user?.email,
    userFullName: dbOrder.user?.fullName,
    totalAmount: dbOrder.totalAmount,
    status: dbOrder.status,
    itemCount: dbOrder.items.length,
  });
  await prisma.$disconnect();

  console.log('\n✅ All API & DB tests completed successfully!');
}

test().catch(console.error);

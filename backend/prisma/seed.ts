import { PrismaClient, Role } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  // ─── 1. SEED PRODUCTS ────────────────────────────────────────────────────────
  const baseProducts = [
    {
      name: 'Cà phê Đen',
      description:
        'Chiết xuất từ hạt Robusta và Arabica rang đậm mộc, mang vị đắng êm sâu lắng, hậu vị thanh nhẹ và hương thơm nồng nàn nguyên bản.',
      imageUrl: '/images/products/ca-phe-den.png',
      basePrice: 29000,
      category: 'vietnamese',
      tag: 'Đậm vị',
    },
    {
      name: 'Cà phê Sữa',
      description:
        'Sự kết hợp kinh điển giữa cà phê pha phin truyền thống đậm đà và sữa đặc sánh mịn. Từng giọt cà phê loang tự nhiên qua đá viên tạo nên vị ngọt béo, đắng dịu hài hòa.',
      imageUrl: '/images/products/ca-phe-sua.png',
      basePrice: 35000,
      category: 'vietnamese',
      tag: 'Phổ biến',
    },
    {
      name: 'Cà phê Bạc Xỉu',
      description:
        'Dòng sữa tươi thanh béo quyện cùng chút sữa đặc ngọt dịu, điểm xuyết một lớp cà phê phin thơm nhẹ trên bề mặt, mang hương vị dịu êm, ngậy béo và dễ uống.',
      imageUrl: '/images/products/ca-phe-bac-xiu.png',
      basePrice: 39000,
      category: 'vietnamese',
      tag: 'Béo ngậy',
    },
    {
      name: 'Cà phê Muối',
      description:
        'Nền cà phê sữa đá đậm vị hòa quyện cùng lớp kem bọt muối biển sánh mịn, béo mặn bồng bềnh bên trên, rắc nhẹ bột cacao nguyên chất tạo điểm nhấn tròn vị.',
      imageUrl: '/images/products/ca-phe-muoi.png',
      basePrice: 42000,
      category: 'vietnamese',
      tag: 'Đặc sản',
    },
    {
      name: 'Iced Caramel Macchiato',
      description:
        'Cà phê espresso phân tầng tinh tế cùng sữa tươi mát lạnh và siro vani ngọt dịu, phủ lớp bọt sữa dày mịn đan xen những đường sốt caramel vàng óng thơm ngậy.',
      imageUrl: '/images/products/iced-caramel-macchiato.png',
      basePrice: 49000,
      category: 'espresso',
      tag: 'Signature',
    },
    {
      name: 'Matcha Latte Uji',
      description:
        'Bột trà xanh Uji cao cấp từ Nhật Bản được đánh bọt mịn màng, hòa cùng dòng sữa tươi béo nhẹ. Thức uống mang sắc xanh ngọc bích, vị chát thanh dịu và hậu ngọt êm ái.',
      imageUrl: '/images/products/matcha-latte.png',
      basePrice: 49000,
      category: 'tea',
      tag: 'Uji Kyoto',
    },
    {
      name: 'Trà Đào Cam Sả',
      description:
        'Nền trà đen ủ lạnh ngát hương sả tươi tự nhiên, kết hợp cùng vị chua ngọt sảng khoái của tép cam vàng tươi và miếng đào giòn mọng, giúp thanh nhiệt tức thì.',
      imageUrl: '/images/products/tra-dao-cam-sa.png',
      basePrice: 45000,
      category: 'tea',
      tag: 'Thanh mát',
    },
    {
      name: 'Bánh Pain au Chocolat',
      description:
        'Lớp vỏ bánh ngàn lớp xốp giòn ôm trọn hai thanh sô-cô-la đen đậm vị tan chảy ở giữa. Sự kết hợp hoàn hảo giữa độ giòn béo của bơ và vị đắng ngọt tinh tế.',
      imageUrl: '/images/products/pain-au-chocolat.png',
      basePrice: 39000,
      category: 'bakery',
      tag: 'Bơ Pháp',
    },
    {
      name: 'Basque Burnt Cheesecake',
      description:
        'Bánh phô mai nướng cháy xém bề mặt theo phong cách xứ Basque, đượm hương caramel nướng đặc trưng. Cốt bánh mềm ngậy, mịn tan và có hậu chua thanh nhẹ từ kem phô mai.',
      imageUrl: '/images/products/basque-burnt-cheesecake.png',
      basePrice: 45000,
      category: 'bakery',
      tag: 'Xứ Basque',
    },
    {
      name: 'Classic Tiramisu',
      description:
        'Cốt bánh ladyfinger mềm mại thấm đẫm cà phê espresso đậm đặc, xen kẽ các lớp kem phô mai mascarpone béo mịn và phủ bề mặt bằng lớp bột cacao thơm bùi, đắng nhẹ.',
      imageUrl: '/images/products/classic-tiramisu.png',
      basePrice: 49000,
      category: 'bakery',
      tag: 'Cổ điển Ý',
    },
  ];

  const croissantPath = path.resolve(
    __dirname,
    '../../frontend/public/images/products/croissant.png',
  );
  const products = [...baseProducts];
  if (fs.existsSync(croissantPath)) {
    products.push({
      name: 'Bánh Sừng Bò Croissant Bơ Pháp',
      description:
        'Bánh ngàn lớp nướng thủ công với bơ Pháp cao cấp. Vỏ ngoài vàng ruộm giòn tan từng lớp rụm, ruột bánh xốp mềm, thơm đậm vị bơ tự nhiên mà không gây ngấy.',
      imageUrl: '/images/products/croissant.png',
      basePrice: 35000,
      category: 'bakery',
      tag: 'Bơ Pháp',
    });
  }

  console.log('Seeding products...');
  const existingProductCount = await prisma.product.count();
  if (existingProductCount === 0) {
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      await prisma.product.upsert({
        where: { id: i + 1 },
        update: {},
        create: {
          id: i + 1,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
          basePrice: p.basePrice,
          category: p.category,
          tag: p.tag,
          isActive: true,
          isSoldOutManual: false,
        },
      });
    }
    console.log(`Seeded ${products.length} products successfully.`);
  } else {
    console.log(`Products already exist (${existingProductCount}), preserving Admin customizations.`);
  }

  // ─── 2. SEED INGREDIENTS (12 NGUYÊN LIỆU PHA CHẾ + 3 BÁNH NHẬP SẴN KÈM GIÁ NHẬP) ─────────
  const ingredientsData = [
    {
      code: 'ING_ROBUSTA',
      name: 'Hạt Cà phê Robusta Đắk Lắk mộc',
      unit: 'g',
      stock: 5000,
      minThreshold: 500,
      costPerUnit: 220, // 220.000đ / 1 Kg
    },
    {
      code: 'ING_ARABICA',
      name: 'Hạt Cà phê Arabica Cầu Đất',
      unit: 'g',
      stock: 3000,
      minThreshold: 300,
      costPerUnit: 350, // 350.000đ / 1 Kg
    },
    {
      code: 'ING_MILK_COND',
      name: 'Sữa đặc có đường Phương Nam',
      unit: 'ml',
      stock: 10000,
      minThreshold: 1000,
      costPerUnit: 55, // 55.000đ / 1 Lít
    },
    {
      code: 'ING_MILK_FRESH',
      name: 'Sữa tươi thanh trùng Barista',
      unit: 'ml',
      stock: 15000,
      minThreshold: 1500,
      costPerUnit: 38, // 38.000đ / 1 Lít
    },
    {
      code: 'ING_CREAM_RICH',
      name: "Kem béo thực vật Rich's & Whipping",
      unit: 'ml',
      stock: 5000,
      minThreshold: 500,
      costPerUnit: 85, // 85.000đ / 1 Lít
    },
    {
      code: 'ING_MATCHA',
      name: 'Bột Trà Xanh Uji Matcha Nhật Bản',
      unit: 'g',
      stock: 1000,
      minThreshold: 150,
      costPerUnit: 950, // 950.000đ / 1 Kg
    },
    {
      code: 'ING_TEA_BLACK',
      name: 'Cốt Trà Đen Ceylon thượng hạng',
      unit: 'ml',
      stock: 10000,
      minThreshold: 1000,
      costPerUnit: 18, // 18.000đ / 1 Lít cốt trà
    },
    {
      code: 'ING_PEACH',
      name: 'Đào miếng ngâm giòn',
      unit: 'lát',
      stock: 200,
      minThreshold: 30,
      costPerUnit: 2500, // 2.500đ / 1 lát đào
    },
    {
      code: 'ING_SYRUP_ORANGE',
      name: 'Siro Cam Vàng & Sả Tươi',
      unit: 'ml',
      stock: 3000,
      minThreshold: 300,
      costPerUnit: 140, // 140.000đ / 1 Lít
    },
    {
      code: 'ING_CARAMEL',
      name: 'Sốt Caramel béo vàng óng',
      unit: 'ml',
      stock: 2000,
      minThreshold: 200,
      costPerUnit: 180, // 180.000đ / 1 Lít
    },
    {
      code: 'ING_BOBA',
      name: 'Trân Châu Trắng 3Q giòn',
      unit: 'g',
      stock: 4000,
      minThreshold: 500,
      costPerUnit: 65, // 65.000đ / 1 Kg
    },
    {
      code: 'ING_SEA_SALT',
      name: 'Muối Biển Hầm Tinh Khiết',
      unit: 'g',
      stock: 1000,
      minThreshold: 100,
      costPerUnit: 40, // 40.000đ / 1 Kg
    },
    // 3 món bánh ngọt nhập sẵn theo số lượng đơn vị
    {
      code: 'ING_PAIN_AU_CHOCOLAT',
      name: 'Bánh Pain au Chocolat (Nhập sẵn)',
      unit: 'chiếc',
      stock: 30,
      minThreshold: 5,
      costPerUnit: 18000, // 18.000đ / 1 chiếc
    },
    {
      code: 'ING_CHEESECAKE',
      name: 'Bánh Basque Burnt Cheesecake (Nhập sẵn)',
      unit: 'lát',
      stock: 25,
      minThreshold: 5,
      costPerUnit: 22000, // 22.000đ / 1 lát
    },
    {
      code: 'ING_TIRAMISU',
      name: 'Bánh Classic Tiramisu (Nhập sẵn)',
      unit: 'phần',
      stock: 25,
      minThreshold: 5,
      costPerUnit: 24000, // 24.000đ / 1 phần
    },
  ];

  console.log('Seeding ingredients...');
  const ingMap: Record<string, number> = {};
  for (const ing of ingredientsData) {
    const existingIng = await prisma.ingredient.findUnique({ where: { code: ing.code } });
    const record = await prisma.ingredient.upsert({
      where: { code: ing.code },
      update: {
        name: ing.name,
        unit: ing.unit,
        minThreshold: ing.minThreshold,
        ...(existingIng && existingIng.costPerUnit === 0
          ? { costPerUnit: ing.costPerUnit }
          : {}),
      },
      create: ing,
    });
    ingMap[ing.code] = record.id;
  }
  console.log(`Seeded ${ingredientsData.length} ingredients successfully.`);

  // ─── 3. SEED RECIPES (CÔNG THỨC ĐỊNH LƯỢNG 7 ĐỒ UỐNG + 3 BÁNH NHẬP SẴN) ────
  const recipesData: Array<{
    productId: number;
    ingCode: string;
    size: string;
    amount: number;
  }> = [
    // 1. Cà phê Đen (id: 1)
    { productId: 1, ingCode: 'ING_ROBUSTA', size: 'S', amount: 20 },
    { productId: 1, ingCode: 'ING_ROBUSTA', size: 'M', amount: 25 },
    { productId: 1, ingCode: 'ING_ROBUSTA', size: 'L', amount: 30 },

    // 2. Cà phê Sữa (id: 2)
    { productId: 2, ingCode: 'ING_ROBUSTA', size: 'S', amount: 20 },
    { productId: 2, ingCode: 'ING_MILK_COND', size: 'S', amount: 30 },
    { productId: 2, ingCode: 'ING_ROBUSTA', size: 'M', amount: 25 },
    { productId: 2, ingCode: 'ING_MILK_COND', size: 'M', amount: 40 },
    { productId: 2, ingCode: 'ING_ROBUSTA', size: 'L', amount: 30 },
    { productId: 2, ingCode: 'ING_MILK_COND', size: 'L', amount: 50 },

    // 3. Cà phê Bạc Xỉu (id: 3)
    { productId: 3, ingCode: 'ING_ROBUSTA', size: 'S', amount: 12 },
    { productId: 3, ingCode: 'ING_MILK_COND', size: 'S', amount: 35 },
    { productId: 3, ingCode: 'ING_MILK_FRESH', size: 'S', amount: 70 },
    { productId: 3, ingCode: 'ING_ROBUSTA', size: 'M', amount: 15 },
    { productId: 3, ingCode: 'ING_MILK_COND', size: 'M', amount: 45 },
    { productId: 3, ingCode: 'ING_MILK_FRESH', size: 'M', amount: 100 },
    { productId: 3, ingCode: 'ING_ROBUSTA', size: 'L', amount: 20 },
    { productId: 3, ingCode: 'ING_MILK_COND', size: 'L', amount: 55 },
    { productId: 3, ingCode: 'ING_MILK_FRESH', size: 'L', amount: 130 },

    // 4. Cà phê Muối (id: 4)
    { productId: 4, ingCode: 'ING_ROBUSTA', size: 'S', amount: 20 },
    { productId: 4, ingCode: 'ING_MILK_COND', size: 'S', amount: 25 },
    { productId: 4, ingCode: 'ING_CREAM_RICH', size: 'S', amount: 35 },
    { productId: 4, ingCode: 'ING_SEA_SALT', size: 'S', amount: 1 },
    { productId: 4, ingCode: 'ING_ROBUSTA', size: 'M', amount: 25 },
    { productId: 4, ingCode: 'ING_MILK_COND', size: 'M', amount: 35 },
    { productId: 4, ingCode: 'ING_CREAM_RICH', size: 'M', amount: 45 },
    { productId: 4, ingCode: 'ING_SEA_SALT', size: 'M', amount: 1.5 },
    { productId: 4, ingCode: 'ING_ROBUSTA', size: 'L', amount: 30 },
    { productId: 4, ingCode: 'ING_MILK_COND', size: 'L', amount: 45 },
    { productId: 4, ingCode: 'ING_CREAM_RICH', size: 'L', amount: 60 },
    { productId: 4, ingCode: 'ING_SEA_SALT', size: 'L', amount: 2 },

    // 5. Iced Caramel Macchiato (id: 5)
    { productId: 5, ingCode: 'ING_ARABICA', size: 'S', amount: 16 },
    { productId: 5, ingCode: 'ING_MILK_FRESH', size: 'S', amount: 100 },
    { productId: 5, ingCode: 'ING_CARAMEL', size: 'S', amount: 15 },
    { productId: 5, ingCode: 'ING_ARABICA', size: 'M', amount: 20 },
    { productId: 5, ingCode: 'ING_MILK_FRESH', size: 'M', amount: 130 },
    { productId: 5, ingCode: 'ING_CARAMEL', size: 'M', amount: 20 },
    { productId: 5, ingCode: 'ING_ARABICA', size: 'L', amount: 24 },
    { productId: 5, ingCode: 'ING_MILK_FRESH', size: 'L', amount: 160 },
    { productId: 5, ingCode: 'ING_CARAMEL', size: 'L', amount: 25 },

    // 6. Matcha Latte Uji (id: 6)
    { productId: 6, ingCode: 'ING_MATCHA', size: 'S', amount: 10 },
    { productId: 6, ingCode: 'ING_MILK_FRESH', size: 'S', amount: 120 },
    { productId: 6, ingCode: 'ING_MATCHA', size: 'M', amount: 14 },
    { productId: 6, ingCode: 'ING_MILK_FRESH', size: 'M', amount: 150 },
    { productId: 6, ingCode: 'ING_MATCHA', size: 'L', amount: 18 },
    { productId: 6, ingCode: 'ING_MILK_FRESH', size: 'L', amount: 180 },

    // 7. Trà Đào Cam Sả (id: 7)
    { productId: 7, ingCode: 'ING_TEA_BLACK', size: 'S', amount: 120 },
    { productId: 7, ingCode: 'ING_SYRUP_ORANGE', size: 'S', amount: 20 },
    { productId: 7, ingCode: 'ING_PEACH', size: 'S', amount: 2 },
    { productId: 7, ingCode: 'ING_TEA_BLACK', size: 'M', amount: 160 },
    { productId: 7, ingCode: 'ING_SYRUP_ORANGE', size: 'M', amount: 30 },
    { productId: 7, ingCode: 'ING_PEACH', size: 'M', amount: 3 },
    { productId: 7, ingCode: 'ING_TEA_BLACK', size: 'L', amount: 200 },
    { productId: 7, ingCode: 'ING_SYRUP_ORANGE', size: 'L', amount: 40 },
    { productId: 7, ingCode: 'ING_PEACH', size: 'L', amount: 4 },

    // 8. Bánh Pain au Chocolat (id: 8) — Bánh nhập về trừ theo chiếc
    { productId: 8, ingCode: 'ING_PAIN_AU_CHOCOLAT', size: 'ALL', amount: 1 },

    // 9. Basque Burnt Cheesecake (id: 9) — Bánh nhập về trừ theo lát
    { productId: 9, ingCode: 'ING_CHEESECAKE', size: 'ALL', amount: 1 },

    // 10. Classic Tiramisu (id: 10) — Bánh nhập về trừ theo phần
    { productId: 10, ingCode: 'ING_TIRAMISU', size: 'ALL', amount: 1 },
  ];

  console.log('Seeding product recipes...');
  const existingProductsList = await prisma.product.findMany({ select: { id: true } });
  const existingProductIdSet = new Set(existingProductsList.map((p) => p.id));
  const existingRecipeCount = await prisma.recipe.count();
  if (existingRecipeCount === 0) {
    for (const r of recipesData) {
      const ingredientId = ingMap[r.ingCode];
      if (!ingredientId || !existingProductIdSet.has(r.productId)) continue;
      await prisma.recipe.upsert({
        where: {
          productId_ingredientId_size: {
            productId: r.productId,
            ingredientId,
            size: r.size,
          },
        },
        update: { amount: r.amount },
        create: {
          productId: r.productId,
          ingredientId,
          size: r.size,
          amount: r.amount,
        },
      });
    }
  }

  // ─── 4. SEED TOPPING RECIPES (4 LOẠI TOPPING KÈM GIÁ BÁN & MÔ TẢ) ───────────
  const toppingRecipesData = [
    {
      toppingId: 'boba',
      toppingName: 'Trân châu trắng giòn',
      subtext: 'Crystal boba dẻo dai',
      price: 8000,
      ingCode: 'ING_BOBA',
      amount: 40,
    },
    {
      toppingId: 'cream',
      toppingName: 'Thêm Kem Muối Béo',
      subtext: 'Velvety Salted Foam',
      price: 10000,
      ingCode: 'ING_CREAM_RICH',
      amount: 35,
    },
    {
      toppingId: 'cream',
      toppingName: 'Thêm Kem Muối Béo',
      subtext: 'Velvety Salted Foam',
      price: 10000,
      ingCode: 'ING_SEA_SALT',
      amount: 1,
    },
    {
      toppingId: 'jelly',
      toppingName: 'Thạch Cà Phê Phin',
      subtext: 'Đậm vị Robusta giòn sần sật',
      price: 8000,
      ingCode: 'ING_ROBUSTA',
      amount: 10,
    },
    {
      toppingId: 'shot',
      toppingName: 'Thêm 1 Shot Espresso',
      subtext: 'Tăng cường tỉnh táo đậm sâu',
      price: 12000,
      ingCode: 'ING_ARABICA',
      amount: 18,
    },
  ];

  console.log('Seeding topping recipes...');
  for (const tr of toppingRecipesData) {
    const ingredientId = ingMap[tr.ingCode];
    if (!ingredientId) continue;
    await prisma.toppingRecipe.upsert({
      where: {
        toppingId_ingredientId: {
          toppingId: tr.toppingId,
          ingredientId,
        },
      },
      update: {},
      create: {
        toppingId: tr.toppingId,
        toppingName: tr.toppingName,
        subtext: tr.subtext,
        price: tr.price,
        isActive: true,
        ingredientId,
        amount: tr.amount,
      },
    });
  }

  // ─── 4B. SEED DEFAULT GLOBAL SIZE PRICING & VOUCHERS ───────────────────────
  const defaultSettings = [
    { key: 'SIZE_UPCHARGE_S', value: '0', description: 'Phụ thu Size S chuẩn toàn quán (VNĐ)' },
    { key: 'SIZE_UPCHARGE_M', value: '5000', description: 'Phụ thu Size M chuẩn toàn quán (VNĐ)' },
    { key: 'SIZE_UPCHARGE_L', value: '10000', description: 'Phụ thu Size L chuẩn toàn quán (VNĐ)' },
  ];
  for (const st of defaultSettings) {
    await prisma.storeSetting.upsert({
      where: { key: st.key },
      update: {},
      create: st,
    });
  }

  const defaultVouchers = [
    {
      code: 'BREWCOZY',
      description: 'Ưu đãi Giờ vàng giảm 15% toàn menu',
      discountPercent: 15,
      minOrderAmount: 0,
      isActive: true,
    },
    {
      code: 'BREW10',
      description: 'Voucher Giảm 10% Toàn Đơn',
      discountPercent: 10,
      minOrderAmount: 0,
      isActive: true,
    },
    {
      code: 'BREW20',
      description: 'Voucher Giảm 20% Đơn Từ 60k',
      discountPercent: 20,
      minOrderAmount: 60000,
      isActive: true,
    },
    {
      code: 'BREW50',
      description: 'Siêu Voucher Giảm 50% VIP',
      discountPercent: 50,
      minOrderAmount: 120000,
      isActive: true,
    },
  ];
  for (const v of defaultVouchers) {
    await prisma.discountCode.upsert({
      where: { code: v.code },
      update: {
        description: v.description,
        minOrderAmount: v.minOrderAmount,
        discountPercent: v.discountPercent,
      },
      create: v,
    });
  }

  // ─── 5. SEED USERS (ADMIN, STAFF, CUSTOMER) ────────────────────────────────
  const bcrypt = await import('bcrypt');
  const adminHash = await bcrypt.hash('Admin@123', 10);
  const staffHash = await bcrypt.hash('Staff@123', 10);
  const khachHash = await bcrypt.hash('Password123', 10);
  const testHash = await bcrypt.hash('password123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@brewlite.vn' },
    update: {
      passwordHash: adminHash,
      role: Role.ADMIN,
      fullName: 'Quản Lý Cửa Hàng (Admin)',
    },
    create: {
      email: 'admin@brewlite.vn',
      passwordHash: adminHash,
      role: Role.ADMIN,
      fullName: 'Quản Lý Cửa Hàng (Admin)',
      phone: '0901000001',
      loyaltyPoints: 500,
    },
  });

  await prisma.user.upsert({
    where: { email: 'staff@brewlite.vn' },
    update: {
      passwordHash: staffHash,
      role: Role.STAFF,
      fullName: 'Barista Trưởng Ca (Staff)',
    },
    create: {
      email: 'staff@brewlite.vn',
      passwordHash: staffHash,
      role: Role.STAFF,
      fullName: 'Barista Trưởng Ca (Staff)',
      phone: '0901000002',
      loyaltyPoints: 0,
    },
  });

  await prisma.user.upsert({
    where: { email: 'khach@brewlite.vn' },
    update: {
      passwordHash: khachHash,
      role: Role.CUSTOMER,
      fullName: 'Khách Hàng Thân Thiết',
      loyaltyPoints: 120,
    },
    create: {
      email: 'khach@brewlite.vn',
      passwordHash: khachHash,
      role: Role.CUSTOMER,
      fullName: 'Khách Hàng Thân Thiết',
      phone: '0901000003',
      loyaltyPoints: 120,
    },
  });

  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      passwordHash: testHash,
      role: Role.CUSTOMER,
    },
    create: {
      email: 'test@example.com',
      passwordHash: testHash,
      role: Role.CUSTOMER,
      fullName: 'Khách hàng Demo',
    },
  });

  console.log('Seeded users: admin@brewlite.vn, staff@brewlite.vn, khach@brewlite.vn, test@example.com');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

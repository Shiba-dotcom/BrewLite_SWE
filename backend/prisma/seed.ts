import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  const baseProducts = [
    {
      name: 'Cà phê Đen',
      description:
        'Chiết xuất từ hạt Robusta và Arabica rang đậm mộc, mang vị đắng êm sâu lắng, hậu vị thanh nhẹ và hương thơm nồng nàn nguyên bản.',
      imageUrl: '/images/products/ca-phe-den.png',
      basePrice: 29000,
    },
    {
      name: 'Cà phê Sữa',
      description:
        'Sự kết hợp kinh điển giữa cà phê pha phin truyền thống đậm đà và sữa đặc sánh mịn. Từng giọt cà phê loang tự nhiên qua đá viên tạo nên vị ngọt béo, đắng dịu hài hòa.',
      imageUrl: '/images/products/ca-phe-sua.png',
      basePrice: 35000,
    },
    {
      name: 'Cà phê Bạc Xỉu',
      description:
        'Dòng sữa tươi thanh béo quyện cùng chút sữa đặc ngọt dịu, điểm xuyết một lớp cà phê phin thơm nhẹ trên bề mặt, mang hương vị dịu êm, ngậy béo và dễ uống.',
      imageUrl: '/images/products/ca-phe-bac-xiu.png',
      basePrice: 39000,
    },
    {
      name: 'Cà phê Muối',
      description:
        'Nền cà phê sữa đá đậm vị hòa quyện cùng lớp kem bọt muối biển sánh mịn, béo mặn bồng bềnh bên trên, rắc nhẹ bột cacao nguyên chất tạo điểm nhấn tròn vị.',
      imageUrl: '/images/products/ca-phe-muoi.png',
      basePrice: 42000,
    },
    {
      name: 'Iced Caramel Macchiato',
      description:
        'Cà phê espresso phân tầng tinh tế cùng sữa tươi mát lạnh và siro vani ngọt dịu, phủ lớp bọt sữa dày mịn đan xen những đường sốt caramel vàng óng thơm ngậy.',
      imageUrl: '/images/products/iced-caramel-macchiato.png',
      basePrice: 49000,
    },
    {
      name: 'Matcha Latte Uji',
      description:
        'Bột trà xanh Uji cao cấp từ Nhật Bản được đánh bọt mịn màng, hòa cùng dòng sữa tươi béo nhẹ. Thức uống mang sắc xanh ngọc bích, vị chát thanh dịu và hậu ngọt êm ái.',
      imageUrl: '/images/products/matcha-latte.png',
      basePrice: 49000,
    },
    {
      name: 'Trà Đào Cam Sả',
      description:
        'Nền trà đen ủ lạnh ngát hương sả tươi tự nhiên, kết hợp cùng vị chua ngọt sảng khoái của tép cam vàng tươi và miếng đào giòn mọng, giúp thanh nhiệt tức thì.',
      imageUrl: '/images/products/tra-dao-cam-sa.png',
      basePrice: 45000,
    },
    {
      name: 'Bánh Pain au Chocolat',
      description:
        'Lớp vỏ bánh ngàn lớp xốp giòn ôm trọn hai thanh sô-cô-la đen đậm vị tan chảy ở giữa. Sự kết hợp hoàn hảo giữa độ giòn béo của bơ và vị đắng ngọt tinh tế.',
      imageUrl: '/images/products/pain-au-chocolat.png',
      basePrice: 39000,
    },
    {
      name: 'Basque Burnt Cheesecake',
      description:
        'Bánh phô mai nướng cháy xém bề mặt theo phong cách xứ Basque, đượm hương caramel nướng đặc trưng. Cốt bánh mềm ngậy, mịn tan và có hậu chua thanh nhẹ từ kem phô mai.',
      imageUrl: '/images/products/basque-burnt-cheesecake.png',
      basePrice: 45000,
    },
    {
      name: 'Classic Tiramisu',
      description:
        'Cốt bánh ladyfinger mềm mại thấm đẫm cà phê espresso đậm đặc, xen kẽ các lớp kem phô mai mascarpone béo mịn và phủ bề mặt bằng lớp bột cacao thơm bùi, đắng nhẹ.',
      imageUrl: '/images/products/classic-tiramisu.png',
      basePrice: 49000,
    },
  ];

  // Kiểm tra nếu có thêm file croissant.png thì bổ sung món Croissant
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
    });
  }

  console.log('Seeding products...');
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    await prisma.product.upsert({
      where: { id: i + 1 },
      update: {
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        basePrice: p.basePrice,
      },
      create: {
        id: i + 1,
        name: p.name,
        description: p.description,
        imageUrl: p.imageUrl,
        basePrice: p.basePrice,
      },
    });
  }
  console.log(`Seeded ${products.length} products successfully.`);

  // Seed default test user (test@example.com / password123)
  const bcrypt = await import('bcrypt');
  const hashedPassword = await bcrypt.hash('password123', 10);
  await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {
      passwordHash: hashedPassword,
    },
    create: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
      fullName: 'Khách hàng Demo',
    },
  });
  console.log('Seeded default test user: test@example.com / password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

async function main() {
  const prisma = new PrismaClient();
  let user = await prisma.user.findUnique({ where: { email: 'demo@brewlite.vn' } });
  const hash = await bcrypt.hash('Password123!', 10);
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'demo@brewlite.vn',
        passwordHash: hash,
        fullName: 'Nguyễn Văn Brew',
        phone: '0909123456',
      },
    });
    console.log('Created user demo@brewlite.vn');
  } else {
    await prisma.user.update({
      where: { email: 'demo@brewlite.vn' },
      data: { passwordHash: hash },
    });
    console.log('Updated password for demo@brewlite.vn');
  }

  // Create or attach an order for demo@brewlite.vn
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalAmount: 110000,
      status: 'PENDING',
      items: {
        create: [
          {
            productId: 1,
            productName: 'Caramel Macchiato Reserve',
            size: 'M',
            toppings: ['Kem mặn sủi bọt'],
            quantity: 2,
            unitPrice: 55000,
          },
        ],
      },
    },
  });

  console.log(`READY: Email=demo@brewlite.vn | Password=Password123! | OrderId=${order.id}`);
  await prisma.$disconnect();
}

main().catch(console.error);

import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      totalAmount: 145000,
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
          {
            productId: 7,
            productName: 'Pain au Chocolat Artisanal',
            size: 'Tiêu chuẩn',
            toppings: [],
            quantity: 1,
            unitPrice: 35000,
          },
        ],
      },
    },
  });
  console.log('CREATED_ORDER_ID=' + order.id);
  await prisma.$disconnect();
}

main().catch(console.error);

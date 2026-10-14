import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto) {
    // Tính totalAmount server-side — không tin tưởng client
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          totalAmount,
          // userId nullable cho đến khi Task 7 (JWT auth) hoàn thành
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              size: item.size,
              toppings: item.toppings,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });

      return newOrder;
    });

    return {
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      items: order.items,
    };
  }
}

import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto, userId: number) {
    // Tính totalAmount server-side — không tin tưởng client
    const totalAmount = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          totalAmount,
          userId, // ← lấy từ JWT payload (đã xác thực), không từ body
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

  /**
   * Lấy danh sách toàn bộ đơn hàng của user (Task 9 — GET /orders/me)
   */
  async getMyOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) => ({
      id: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items,
      payments: order.payments,
    }));
  }

  /**
   * Lấy chi tiết đơn hàng theo ID (Task 8)
   * Kiểm tra quyền sở hữu đơn hàng (order.userId === userId)
   */
  async getOrderById(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã #${orderId}`);
    }

    if (order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập vào đơn hàng này');
    }

    return {
      id: order.id,
      orderId: order.id,
      status: order.status,
      totalAmount: order.totalAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items,
      payments: order.payments,
    };
  }
}


import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { assertTransition } from '../payments/state-machine.helper.js';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrder(dto: CreateOrderDto, userId: number) {
    // 1. Tính rawSubtotal server-side — không tin tưởng client
    const rawSubtotal = dto.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    // 2. Xử lý mã giảm giá (Voucher / Discount Code)
    let discountAmount = 0;
    let appliedDiscountCode: string | null = null;

    if (dto.discountCode && dto.discountCode.trim()) {
      const code = dto.discountCode.trim().toUpperCase();
      const DISCOUNT_RATES: Record<string, number> = {
        BREW10: 0.1, // Giảm 10%
        BREWCOZY: 0.15, // Giảm 15% (Khách hàng thân thiết)
        BREW20: 0.2, // Giảm 20%
        BREW50: 0.5, // Giảm 50%
      };

      if (!DISCOUNT_RATES[code]) {
        throw new BadRequestException(
          `Mã giảm giá "${dto.discountCode}" không hợp lệ hoặc đã hết hạn.`,
        );
      }

      discountAmount = Math.round(rawSubtotal * DISCOUNT_RATES[code]);
      appliedDiscountCode = code;
    }

    const totalAmount = Math.max(0, rawSubtotal - discountAmount);

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          totalAmount,
          discountCode: appliedDiscountCode,
          discountAmount,
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
      discountCode: order.discountCode,
      discountAmount: order.discountAmount,
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
  /**
   * Cập nhật trạng thái đơn hàng thủ công (Task 10 — PATCH /orders/:id/status)
   * Dùng assertTransition để đảm bảo State Machine Guard
   */
  async updateOrderStatus(orderId: number, nextStatus: OrderStatus, userId: number) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã #${orderId}`);
    }

    if (order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng này');
    }

    // State Machine Guard: chặn các transition không hợp lệ
    assertTransition(order.status, nextStatus);

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });

    return {
      orderId: updated.id,
      previousStatus: order.status,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

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
      discountCode: order.discountCode,
      discountAmount: order.discountAmount,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items,
      payments: order.payments,
    };
  }
}


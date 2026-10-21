import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { OrderStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { assertTransition } from '../payments/state-machine.helper.js';

const POINTS_PER_VND = 1000;

export interface RequiredIngredientItem {
  ingredientId: number;
  code: string;
  name: string;
  unit: string;
  requiredAmount: number;
}

@Injectable()
export class OrdersService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OrdersService.name);
  private expirationInterval: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Quét và dọn dẹp các đơn PENDING quá hạn 5 phút ngay khi khởi động
    this.cancelExpiredPendingOrders().catch((err) => {
      this.logger.error('Lỗi khi quét đơn hết hạn lúc khởi động:', err);
    });

    // Định kỳ quét mỗi 15 giây để tự động hủy đơn PENDING quá 5 phút và hoàn trả kho
    this.expirationInterval = setInterval(() => {
      this.cancelExpiredPendingOrders().catch((err) => {
        this.logger.error('Lỗi khi quét định kỳ đơn hết hạn:', err);
      });
    }, 15000);
  }

  onModuleDestroy() {
    if (this.expirationInterval) {
      clearInterval(this.expirationInterval);
      this.expirationInterval = null;
    }
  }

  /**
   * Tự động quét và hủy các đơn hàng PENDING đã quá 5 phút (TTL = 5 minutes).
   * Hoàn trả 100% nguyên vật liệu vào kho thông qua Transaction.
   */
  async cancelExpiredPendingOrders(): Promise<number> {
    const EXPIRE_TIMEOUT_MS = 5 * 60 * 1000; // 5 phút
    const expiryThreshold = new Date(Date.now() - EXPIRE_TIMEOUT_MS);

    const expiredOrders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.PENDING,
        createdAt: { lte: expiryThreshold },
      },
      include: { items: true },
    });

    if (!expiredOrders || expiredOrders.length === 0) {
      return 0;
    }

    let cancelledCount = 0;
    for (const order of expiredOrders) {
      try {
        await this.prisma.$transaction(async (tx: any) => {
          if (tx.recipe && tx.ingredient && Array.isArray(order.items)) {
            const requiredIngredients = await this.computeRequiredIngredients(
              tx,
              order.items,
            );
            for (const reqIng of requiredIngredients) {
              await tx.ingredient.update({
                where: { id: reqIng.ingredientId },
                data: {
                  stock: { increment: reqIng.requiredAmount },
                  version: { increment: 1 },
                },
              });
            }
          }

          await tx.order.update({
            where: { id: order.id },
            data: { status: OrderStatus.CANCELLED },
          });
        });
        cancelledCount++;
        this.logger.log(
          `[Auto-Expire 5m] Đơn hàng #${order.id} đã tự động hủy do quá 5 phút chưa thanh toán. Đã hoàn trả nguyên liệu vào kho.`,
        );
      } catch (err) {
        this.logger.error(
          `Lỗi khi tự động hủy đơn hết hạn #${order.id}:`,
          err,
        );
      }
    }

    return cancelledCount;
  }

  /**
   * Tính toán tổng định lượng nguyên vật liệu tiêu hao cho danh sách món + topping
   */
  private async computeRequiredIngredients(
    tx: any,
    items: Array<{
      productId: number;
      size: string;
      toppings: string[];
      quantity: number;
    }>,
  ): Promise<RequiredIngredientItem[]> {
    if (!tx.recipe || !tx.ingredient) {
      return [];
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const [recipes, toppingRecipes] = await Promise.all([
      tx.recipe.findMany({
        where: { productId: { in: productIds } },
        include: { ingredient: true },
      }),
      tx.toppingRecipe
        ? tx.toppingRecipe.findMany({
            include: { ingredient: true },
          })
        : Promise.resolve([]),
    ]);

    const reqMap = new Map<number, RequiredIngredientItem>();

    const addRequirement = (ing: any, amount: number) => {
      if (!ing || amount <= 0) return;
      const existing = reqMap.get(ing.id);
      if (existing) {
        existing.requiredAmount = Number(
          (existing.requiredAmount + amount).toFixed(2),
        );
      } else {
        reqMap.set(ing.id, {
          ingredientId: ing.id,
          code: ing.code,
          name: ing.name,
          unit: ing.unit,
          requiredAmount: Number(amount.toFixed(2)),
        });
      }
    };

    for (const item of items) {
      const normalizedSize = (item.size || 'M').toUpperCase();
      // Lấy công thức theo size hoặc ALL (đối với bánh ngọt)
      const matchedRecipes = recipes.filter(
        (r: any) =>
          r.productId === item.productId &&
          (r.size === normalizedSize || r.size === 'ALL'),
      );

      for (const r of matchedRecipes) {
        addRequirement(r.ingredient, r.amount * item.quantity);
      }

      // Tính nguyên liệu cho Toppings đi kèm
      if (Array.isArray(item.toppings) && item.toppings.length > 0) {
        for (const topStr of item.toppings) {
          const lowerTop = topStr.toLowerCase();
          const matchedTops = toppingRecipes.filter(
            (tr: any) =>
              tr.toppingId.toLowerCase() === lowerTop ||
              tr.toppingName.toLowerCase().includes(lowerTop) ||
              lowerTop.includes(tr.toppingName.toLowerCase()),
          );
          for (const tr of matchedTops) {
            addRequirement(tr.ingredient, tr.amount * item.quantity);
          }
        }
      }
    }

    return Array.from(reqMap.values());
  }

  async createOrder(dto: CreateOrderDto, userId: number) {
    // 1. Tính rawSubtotal server-side
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
        BREWLITE10: 0.1, // Giảm 10%
        BREWCOZY: 0.15, // Giảm 15% (Khách hàng thân thiết)
        BREW20: 0.2, // Giảm 20%
        WELCOME20: 0.2, // Giảm 20%
        BREW50: 0.5, // Giảm 50%
      };

      if (!DISCOUNT_RATES[code]) {
        throw new BadRequestException(
          `Mã giảm giá "${dto.discountCode}" không hợp lệ hoặc đã hết hạn.`,
        );
      }

      discountAmount = Math.floor(rawSubtotal * DISCOUNT_RATES[code]);
      appliedDiscountCode = code;
    }

    const afterDiscount = Math.max(0, rawSubtotal - discountAmount);
    const vat = Math.floor(afterDiscount * 0.08);
    // Làm tròn xuống hàng nghìn (ví dụ: 144.720đ -> 144.000đ)
    const totalAmount = Math.floor((afterDiscount + vat) / 1000) * 1000;

    // 3. Transaction: Trừ tồn kho nguyên vật liệu bằng Optimistic Locking + Tạo đơn PENDING
    const order = await this.prisma.$transaction(async (tx) => {
      const requiredIngredients = await this.computeRequiredIngredients(
        tx,
        dto.items,
      );

      for (const reqIng of requiredIngredients) {
        const currentIng = await tx.ingredient.findUnique({
          where: { id: reqIng.ingredientId },
        });

        if (!currentIng) {
          throw new NotFoundException(
            `Không tìm thấy nguyên vật liệu "${reqIng.name}" trong kho.`,
          );
        }

        if (currentIng.stock < reqIng.requiredAmount) {
          throw new BadRequestException(
            `Nguyên vật liệu "${currentIng.name}" không đủ tồn kho (Cần ${reqIng.requiredAmount}${currentIng.unit}, hiện còn ${currentIng.stock}${currentIng.unit}).`,
          );
        }

        // Optimistic Locking: chỉ trừ kho khi version khớp và stock >= requiredAmount
        const updateRes = await tx.ingredient.updateMany({
          where: {
            id: currentIng.id,
            version: currentIng.version,
            stock: { gte: reqIng.requiredAmount },
          },
          data: {
            stock: { decrement: reqIng.requiredAmount },
            version: { increment: 1 },
          },
        });

        if (updateRes.count === 0) {
          throw new ConflictException(
            `Xung đột đồng thời (Optimistic Lock) khi trừ kho nguyên vật liệu "${currentIng.name}". Vui lòng thử lại.`,
          );
        }
      }

      const newOrder = await tx.order.create({
        data: {
          totalAmount,
          discountCode: appliedDiscountCode,
          discountAmount,
          userId,
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
    // Tự động kiểm tra và hủy các đơn quá 5 phút trước khi trả về danh sách
    await this.cancelExpiredPendingOrders().catch(() => {});

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
   * Lấy hàng đợi đơn hàng cho màn hình Barista KDS (/staff)
   * Kèm thông tin định lượng công thức cho từng món để Barista xem nhanh (Quick Recipe Popover)
   */
  async getBaristaQueue() {
    const [orders, allRecipes, allToppingRecipes] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          status: {
            in: [
              OrderStatus.PAID,
              OrderStatus.PREPARING,
              OrderStatus.READY,
              OrderStatus.COMPLETED,
            ],
          },
        },
        include: {
          items: true,
          user: {
            select: { id: true, email: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.recipe
        ? this.prisma.recipe.findMany({ include: { ingredient: true } })
        : Promise.resolve([]),
      this.prisma.toppingRecipe
        ? this.prisma.toppingRecipe.findMany({ include: { ingredient: true } })
        : Promise.resolve([]),
    ]);

    return orders.map((order) => ({
      ...order,
      items: order.items.map((item) => {
        const normalizedSize = (item.size || 'M').toUpperCase();
        const itemRecipes = allRecipes
          .filter(
            (r: any) =>
              r.productId === item.productId &&
              (r.size === normalizedSize || r.size === 'ALL'),
          )
          .map((r: any) => ({
            ingredientCode: r.ingredient.code,
            ingredientName: r.ingredient.name,
            unit: r.ingredient.unit,
            amountPerUnit: r.amount,
            totalAmount: Number((r.amount * item.quantity).toFixed(2)),
          }));

        const toppingBreakdown: Array<{
          toppingName: string;
          ingredientName: string;
          unit: string;
          totalAmount: number;
        }> = [];

        if (Array.isArray(item.toppings)) {
          for (const topStr of item.toppings) {
            const lowerTop = topStr.toLowerCase();
            const matchedTops = allToppingRecipes.filter(
              (tr: any) =>
                tr.toppingId.toLowerCase() === lowerTop ||
                tr.toppingName.toLowerCase().includes(lowerTop) ||
                lowerTop.includes(tr.toppingName.toLowerCase()),
            );
            for (const tr of matchedTops) {
              toppingBreakdown.push({
                toppingName: tr.toppingName,
                ingredientName: tr.ingredient.name,
                unit: tr.ingredient.unit,
                totalAmount: Number((tr.amount * item.quantity).toFixed(2)),
              });
            }
          }
        }

        return {
          ...item,
          recipeBreakdown: itemRecipes,
          toppingBreakdown,
        };
      }),
    }));
  }

  /**
   * Cập nhật trạng thái đơn hàng (Task 10 & Sprint 4 — PATCH /orders/:id/status)
   * Dùng assertTransition để đảm bảo State Machine Guard.
   * Khi chuyển sang CANCELLED: tự động hoàn kho nguyên vật liệu & thu hồi điểm Loyalty (nếu đơn đã PAID).
   */
  async updateOrderStatus(
    orderId: number,
    nextStatus: OrderStatus,
    userId: number,
    userRole?: Role,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã #${orderId}`);
    }

    const isStaffOrAdmin =
      userRole === Role.STAFF || userRole === Role.ADMIN;

    if (!isStaffOrAdmin && order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền cập nhật đơn hàng này');
    }

    const previousStatus = order.status;

    // State Machine Guard: chặn các transition không hợp lệ
    assertTransition(previousStatus, nextStatus);

    // Nếu hủy đơn (CANCELLED) và có $transaction + recipe -> hoàn lại kho nguyên vật liệu & trừ lại điểm thưởng
    if (nextStatus === OrderStatus.CANCELLED && this.prisma.$transaction) {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        if (tx.recipe && tx.ingredient && Array.isArray(order.items)) {
          const requiredIngredients = await this.computeRequiredIngredients(
            tx,
            order.items,
          );
          for (const reqIng of requiredIngredients) {
            await tx.ingredient.update({
              where: { id: reqIng.ingredientId },
              data: {
                stock: { increment: reqIng.requiredAmount },
                version: { increment: 1 },
              },
            });
          }
        }

        // Nếu hủy từ trạng thái PAID -> thu hồi điểm Loyalty đã cộng
        if (
          previousStatus === OrderStatus.PAID &&
          order.userId &&
          tx.user
        ) {
          const pointsToRevoke = Math.floor(
            order.totalAmount / POINTS_PER_VND,
          );
          if (pointsToRevoke > 0) {
            await tx.user.update({
              where: { id: order.userId },
              data: {
                loyaltyPoints: { decrement: pointsToRevoke },
              },
            });
          }
        }

        return tx.order.update({
          where: { id: orderId },
          data: { status: nextStatus },
        });
      });

      return {
        orderId: updated.id,
        previousStatus,
        status: updated.status,
        updatedAt: updated.updatedAt,
      };
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });

    return {
      orderId: updated.id,
      previousStatus,
      status: updated.status,
      updatedAt: updated.updatedAt,
    };
  }

  async getOrderById(orderId: number, userId: number, userRole?: Role) {
    // Tự động kiểm tra và hủy các đơn quá 5 phút trước khi trả về chi tiết đơn
    await this.cancelExpiredPendingOrders().catch(() => {});

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

    const isStaffOrAdmin =
      userRole === Role.STAFF || userRole === Role.ADMIN;

    if (!isStaffOrAdmin && order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này');
    }

    const productIds = (order.items || []).map((i) => i.productId);
    let productMap = new Map<number, { imageUrl: string | null }>();
    if (this.prisma.product?.findMany && productIds.length > 0) {
      try {
        const products = await this.prisma.product.findMany({
          where: { id: { in: productIds } },
          select: { id: true, imageUrl: true },
        });
        productMap = new Map(products.map((p) => [p.id, p]));
      } catch {
        // fallback if product table not accessible
      }
    }

    return {
      ...order,
      items: order.items.map((item) => ({
        ...item,
        imageUrl: productMap.get(item.productId)?.imageUrl || null,
      })),
    };
  }

  /**
   * Xóa đơn hàng đã hủy hoặc chưa thanh toán (Task xóa đơn)
   * Chỉ cho phép xóa đơn CANCELLED, PAYMENT_FAILED, hoặc PENDING.
   * Nếu đơn PENDING bị xóa, tự động hoàn trả nguyên vật liệu vào kho.
   */
  async deleteOrder(orderId: number, userId: number, userRole?: Role) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã #${orderId}`);
    }

    const isStaffOrAdmin =
      userRole === Role.STAFF || userRole === Role.ADMIN;

    if (!isStaffOrAdmin && order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xóa đơn hàng này');
    }

    // Chỉ cho phép xóa nếu đơn đã CANCELLED hoặc PAYMENT_FAILED hoặc PENDING
    if (
      order.status !== OrderStatus.CANCELLED &&
      order.status !== OrderStatus.PAYMENT_FAILED &&
      order.status !== OrderStatus.PENDING
    ) {
      throw new BadRequestException('Chỉ có thể xóa các đơn hàng đã hủy hoặc chưa thanh toán.');
    }

    // Nếu đơn PENDING bị xóa, hoàn lại nguyên vật liệu
    if (order.status === OrderStatus.PENDING && this.prisma.$transaction) {
      return await this.prisma.$transaction(async (tx: any) => {
        if (tx.recipe && tx.ingredient && Array.isArray(order.items)) {
          const requiredIngredients = await this.computeRequiredIngredients(
            tx,
            order.items,
          );
          for (const reqIng of requiredIngredients) {
            await tx.ingredient.update({
              where: { id: reqIng.ingredientId },
              data: {
                stock: { increment: reqIng.requiredAmount },
                version: { increment: 1 },
              },
            });
          }
        }
        await tx.payment.deleteMany({ where: { orderId } });
        await tx.orderItem.deleteMany({ where: { orderId } });
        await tx.order.delete({ where: { id: orderId } });
        return { success: true, message: `Đã xóa đơn hàng #${orderId}` };
      });
    }

    return await this.prisma.$transaction(async (tx: any) => {
      await tx.payment.deleteMany({ where: { orderId } });
      await tx.orderItem.deleteMany({ where: { orderId } });
      await tx.order.delete({ where: { id: orderId } });
      return { success: true, message: `Đã xóa đơn hàng #${orderId}` };
    });
  }
}

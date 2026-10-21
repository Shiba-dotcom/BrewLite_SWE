import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  RestockIngredientDto,
  UpdateIngredientStockDto,
} from './dto/inventory.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private formatIngredient(ing: any) {
    const status =
      ing.stock <= 0
        ? 'OUT_OF_STOCK'
        : ing.stock <= ing.minThreshold
          ? 'LOW_STOCK'
          : 'OK';
    const maxRef = Math.max(ing.minThreshold * 8, ing.stock, 1);
    const percentage = Math.min(100, Math.round((ing.stock / maxRef) * 100));

    return {
      ...ing,
      status,
      percentage,
    };
  }

  async getAllIngredients() {
    const list = await this.prisma.ingredient.findMany({
      orderBy: { id: 'asc' },
    });
    return list.map((ing) => this.formatIngredient(ing));
  }

  async restockIngredient(id: number, dto: RestockIngredientDto) {
    const current = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Không tìm thấy nguyên vật liệu #${id}`);
    }

    const updated = await this.prisma.ingredient.updateMany({
      where: {
        id,
        version: current.version,
      },
      data: {
        stock: { increment: dto.addAmount },
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new ConflictException(
        'Nguyên vật liệu đang được cập nhật bởi phiên giao dịch khác. Vui lòng thử lại.',
      );
    }

    const refreshed = await this.prisma.ingredient.findUnique({ where: { id } });
    return this.formatIngredient(refreshed);
  }

  async setIngredientStock(id: number, dto: UpdateIngredientStockDto) {
    const current = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Không tìm thấy nguyên vật liệu #${id}`);
    }

    const updated = await this.prisma.ingredient.updateMany({
      where: {
        id,
        version: current.version,
      },
      data: {
        stock: dto.stock,
        ...(dto.minThreshold !== undefined
          ? { minThreshold: dto.minThreshold }
          : {}),
        version: { increment: 1 },
      },
    });

    if (updated.count === 0) {
      throw new ConflictException(
        'Nguyên vật liệu đang được cập nhật bởi phiên giao dịch khác. Vui lòng thử lại.',
      );
    }

    const refreshed = await this.prisma.ingredient.findUnique({ where: { id } });
    return this.formatIngredient(refreshed);
  }

  async getRecipeMatrix() {
    const products = await this.prisma.product.findMany({
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
          orderBy: { id: 'asc' },
        },
      },
      orderBy: { id: 'asc' },
    });

    const toppingRecipes = await this.prisma.toppingRecipe.findMany({
      include: {
        ingredient: true,
      },
      orderBy: { id: 'asc' },
    });

    return {
      products,
      toppingRecipes,
    };
  }

  async getDashboardStats() {
    const [ingredients, orders] = await Promise.all([
      this.getAllIngredients(),
      this.prisma.order.findMany({
        include: {
          items: true,
          user: {
            select: { id: true, email: true, fullName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const revenueStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.COMPLETED,
    ];

    const totalRevenue = orders
      .filter((o) => revenueStatuses.includes(o.status))
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const completedCount = orders.filter(
      (o) => o.status === OrderStatus.COMPLETED,
    ).length;
    const activeCount = orders.filter((o) =>
      [OrderStatus.PAID, OrderStatus.PREPARING, OrderStatus.READY].includes(
        o.status as any,
      ),
    ).length;
    const cancelledCount = orders.filter(
      (o) => o.status === OrderStatus.CANCELLED,
    ).length;

    const lowStockCount = ingredients.filter(
      (i) => i.status === 'LOW_STOCK',
    ).length;
    const outOfStockCount = ingredients.filter(
      (i) => i.status === 'OUT_OF_STOCK',
    ).length;

    return {
      totalIngredients: ingredients.length,
      lowStockCount,
      outOfStockCount,
      totalOrders: orders.length,
      completedCount,
      activeCount,
      cancelledCount,
      totalRevenue,
      recentOrders: orders.slice(0, 15),
    };
  }
}

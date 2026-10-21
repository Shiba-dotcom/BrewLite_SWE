import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateIngredientDto,
  RestockIngredientDto,
  UpdateIngredientDto,
  UpdateIngredientStockDto,
  UpdateRecipeDto,
  UpdateToppingRecipeDto,
  UpsertRecipeDto,
} from './dto/inventory.dto.js';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  private formatIngredient(ing: any) {
    if (!ing) return ing;
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
      recipesCount: Array.isArray(ing.recipes) ? ing.recipes.length : undefined,
    };
  }

  async getAllIngredients() {
    const list = await this.prisma.ingredient.findMany({
      include: {
        recipes: {
          select: { id: true, productId: true, size: true },
        },
      },
      orderBy: { id: 'asc' },
    });
    if (!Array.isArray(list)) return [];
    return list.map((ing) => this.formatIngredient(ing));
  }

  async createIngredient(dto: CreateIngredientDto) {
    const cleanCode = dto.code.trim().toUpperCase().replace(/\s+/g, '_');
    const existing = await this.prisma.ingredient.findUnique({
      where: { code: cleanCode },
    });
    if (existing) {
      throw new ConflictException(
        `Mã nguyên vật liệu "${cleanCode}" đã tồn tại trong kho.`,
      );
    }

    const created = await this.prisma.ingredient.create({
      data: {
        code: cleanCode,
        name: dto.name.trim(),
        unit: dto.unit.trim(),
        stock: dto.stock,
        minThreshold: dto.minThreshold,
      },
    });
    return this.formatIngredient(created);
  }

  async updateIngredient(id: number, dto: UpdateIngredientDto) {
    const current = await this.prisma.ingredient.findUnique({ where: { id } });
    if (!current) {
      throw new NotFoundException(`Không tìm thấy nguyên vật liệu #${id}`);
    }

    let cleanCode: string | undefined;
    if (dto.code !== undefined) {
      cleanCode = dto.code.trim().toUpperCase().replace(/\s+/g, '_');
      if (cleanCode !== current.code) {
        const dup = await this.prisma.ingredient.findUnique({
          where: { code: cleanCode },
        });
        if (dup) {
          throw new ConflictException(
            `Mã nguyên vật liệu "${cleanCode}" đã tồn tại.`,
          );
        }
      }
    }

    const updated = await this.prisma.ingredient.update({
      where: { id },
      data: {
        ...(cleanCode !== undefined ? { code: cleanCode } : {}),
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.unit !== undefined ? { unit: dto.unit.trim() } : {}),
        ...(dto.stock !== undefined ? { stock: dto.stock } : {}),
        ...(dto.minThreshold !== undefined
          ? { minThreshold: dto.minThreshold }
          : {}),
        version: { increment: 1 },
      },
    });

    return this.formatIngredient(updated);
  }

  async deleteIngredient(id: number) {
    const current = await this.prisma.ingredient.findUnique({
      where: { id },
      include: { recipes: true },
    });
    if (!current) {
      throw new NotFoundException(`Không tìm thấy nguyên vật liệu #${id}`);
    }

    await this.prisma.ingredient.delete({ where: { id } });

    return {
      deleted: true,
      id,
      name: current.name,
      removedRecipesCount: current.recipes?.length ?? 0,
    };
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

  async upsertRecipe(dto: UpsertRecipeDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${dto.productId}`);
    }

    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: dto.ingredientId },
    });
    if (!ingredient) {
      throw new NotFoundException(
        `Không tìm thấy nguyên vật liệu #${dto.ingredientId}`,
      );
    }

    const normalizedSize = dto.size.trim().toUpperCase();
    return this.prisma.recipe.upsert({
      where: {
        productId_ingredientId_size: {
          productId: dto.productId,
          ingredientId: dto.ingredientId,
          size: normalizedSize,
        },
      },
      update: {
        amount: dto.amount,
      },
      create: {
        productId: dto.productId,
        ingredientId: dto.ingredientId,
        size: normalizedSize,
        amount: dto.amount,
      },
      include: {
        ingredient: true,
      },
    });
  }

  async updateRecipe(id: number, dto: UpdateRecipeDto) {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy dòng công thức #${id}`);
    }

    return this.prisma.recipe.update({
      where: { id },
      data: {
        ...(dto.size !== undefined
          ? { size: dto.size.trim().toUpperCase() }
          : {}),
        amount: dto.amount,
      },
      include: {
        ingredient: true,
      },
    });
  }

  async deleteRecipe(id: number) {
    const existing = await this.prisma.recipe.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy dòng công thức #${id}`);
    }

    await this.prisma.recipe.delete({ where: { id } });
    return { deleted: true, id };
  }

  async updateToppingRecipe(id: number, dto: UpdateToppingRecipeDto) {
    const existing = await this.prisma.toppingRecipe.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(
        `Không tìm thấy định lượng Topping #${id}`,
      );
    }

    return this.prisma.toppingRecipe.update({
      where: { id },
      data: {
        ...(dto.toppingName !== undefined
          ? { toppingName: dto.toppingName.trim() }
          : {}),
        amount: dto.amount,
      },
      include: {
        ingredient: true,
      },
    });
  }

  async getDashboardStats() {
    const [ingredients, orders] = await Promise.all([
      this.getAllIngredients(),
      this.prisma.order.findMany({
        include: {
          items: true,
          user: {
            select: { id: true, email: true, fullName: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    const revenueStatuses: OrderStatus[] = [
      OrderStatus.PAID,
      OrderStatus.PREPARING,
      OrderStatus.READY,
      OrderStatus.COMPLETED,
    ];

    const validOrders = orders.filter((o) =>
      revenueStatuses.includes(o.status),
    );

    const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);

    // Aggregate Top Best-selling products from valid orders
    const productStatsMap: Record<
      number,
      {
        productId: number;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
        orderCount: number;
      }
    > = {};

    for (const order of validOrders) {
      if (!Array.isArray(order.items)) continue;
      for (const item of order.items) {
        if (!productStatsMap[item.productId]) {
          productStatsMap[item.productId] = {
            productId: item.productId,
            productName: item.productName,
            totalQuantity: 0,
            totalRevenue: 0,
            orderCount: 0,
          };
        }
        productStatsMap[item.productId].totalQuantity += item.quantity;
        productStatsMap[item.productId].totalRevenue +=
          item.unitPrice * item.quantity;
        productStatsMap[item.productId].orderCount += 1;
      }
    }

    const topSellingProducts = Object.values(productStatsMap)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 8);

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
      topSellingProducts,
      recentOrders: orders.slice(0, 50),
    };
  }
}

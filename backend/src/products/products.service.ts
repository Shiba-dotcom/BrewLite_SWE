import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CreateProductDto,
  ToggleProductVisibilityDto,
  UpdateProductDto,
} from './dto/product.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private enrichProductStock(
    product: any,
    orderCountMap?: Record<number, number>,
  ) {
    if (!product) return product;

    const manualSoldOut = Boolean(product.isSoldOutManual);
    const basePrice = Number(product.basePrice || 0);

    if (!Array.isArray(product.recipes) || product.recipes.length === 0) {
      return {
        ...product,
        isOutOfStock: manualSoldOut,
        ingredientOutOfStock: false,
        availableServings: manualSoldOut ? 0 : 99,
        recipesCount: 0,
        orderItemsCount: orderCountMap
          ? (orderCountMap[product.id] ?? 0)
          : undefined,
        cogsSizeS: 0,
        cogsSizeM: 0,
        cogsSizeL: 0,
        grossProfitS: basePrice,
        marginPercentS: 100,
      };
    }

    const baseRecipes = product.recipes.filter(
      (r: any) => r.size === 'S' || r.size === 'ALL',
    );
    const checkRecipes = baseRecipes.length > 0 ? baseRecipes : product.recipes;

    let minServings = Infinity;
    let ingredientOutOfStock = false;

    for (const r of checkRecipes) {
      if (r.ingredient && r.amount > 0) {
        const possible = Math.floor(r.ingredient.stock / r.amount);
        if (possible < minServings) {
          minServings = possible;
        }
        if (r.ingredient.stock < r.amount) {
          ingredientOutOfStock = true;
        }
      }
    }

    const computedServings =
      minServings === Infinity ? 99 : Math.max(0, minServings);

    // Tính Giá vốn (COGS) theo từng Size (S, M, L) dựa trên Recipe.amount * Ingredient.costPerUnit
    const calcCogsForSize = (targetSize: string) => {
      const sizeRecs = product.recipes.filter(
        (r: any) => r.size === targetSize || r.size === 'ALL',
      );
      return Math.round(
        sizeRecs.reduce((sum: number, r: any) => {
          const unitCost = Number(r.ingredient?.costPerUnit || 0);
          return sum + Number(r.amount || 0) * unitCost;
        }, 0),
      );
    };

    const cogsSizeS = calcCogsForSize('S');
    const cogsSizeM = calcCogsForSize('M') || cogsSizeS;
    const cogsSizeL = calcCogsForSize('L') || cogsSizeM;
    const grossProfitS = Math.round(basePrice - cogsSizeS);
    const marginPercentS =
      basePrice > 0
        ? Math.max(0, Math.round((grossProfitS / basePrice) * 100))
        : 0;

    return {
      ...product,
      isOutOfStock: manualSoldOut || ingredientOutOfStock,
      ingredientOutOfStock,
      availableServings: manualSoldOut ? 0 : computedServings,
      recipesCount: product.recipes.length,
      orderItemsCount: orderCountMap
        ? (orderCountMap[product.id] ?? 0)
        : undefined,
      cogsSizeS,
      cogsSizeM,
      cogsSizeL,
      grossProfitS,
      marginPercentS,
    };
  }

  async findAll(includeInactive = false) {
    const products = await this.prisma.product.findMany({
      ...(includeInactive ? {} : { where: { isActive: true } }),
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

    if (!Array.isArray(products)) return products;

    let orderCountMap: Record<number, number> | undefined;
    if (includeInactive && (this.prisma as any).orderItem?.findMany) {
      const orderItems = await this.prisma.orderItem.findMany({
        select: { productId: true, quantity: true },
      });
      orderCountMap = {};
      for (const item of orderItems) {
        orderCountMap[item.productId] =
          (orderCountMap[item.productId] ?? 0) + (item.quantity ?? 1);
      }
    }

    return products.map((p) => this.enrichProductStock(p, orderCountMap));
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
          orderBy: { id: 'asc' },
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return this.enrichProductStock(product);
  }

  async create(dto: CreateProductDto) {
    const created = await this.prisma.product.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        imageUrl: dto.imageUrl?.trim() || '/images/products/ca-phe-sua.png',
        basePrice: dto.basePrice,
        sizeUpchargeM:
          dto.sizeUpchargeM !== undefined ? dto.sizeUpchargeM : null,
        sizeUpchargeL:
          dto.sizeUpchargeL !== undefined ? dto.sizeUpchargeL : null,
        category: dto.category || 'vietnamese',
        tag: dto.tag?.trim() || 'Phổ biến',
        isActive: dto.isActive ?? true,
        isSoldOutManual: dto.isSoldOutManual ?? false,
      },
      include: {
        recipes: {
          include: { ingredient: true },
        },
      },
    });
    return this.enrichProductStock(created);
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description.trim() || null }
          : {}),
        ...(dto.imageUrl !== undefined
          ? { imageUrl: dto.imageUrl.trim() || null }
          : {}),
        ...(dto.basePrice !== undefined ? { basePrice: dto.basePrice } : {}),
        ...(dto.sizeUpchargeM !== undefined
          ? { sizeUpchargeM: dto.sizeUpchargeM }
          : {}),
        ...(dto.sizeUpchargeL !== undefined
          ? { sizeUpchargeL: dto.sizeUpchargeL }
          : {}),
        ...(dto.category !== undefined ? { category: dto.category } : {}),
        ...(dto.tag !== undefined ? { tag: dto.tag.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isSoldOutManual !== undefined
          ? { isSoldOutManual: dto.isSoldOutManual }
          : {}),
      },
      include: {
        recipes: {
          include: { ingredient: true },
        },
      },
    });

    return this.enrichProductStock(updated);
  }

  async toggleVisibility(id: number, dto: ToggleProductVisibilityDto) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.isSoldOutManual !== undefined
          ? { isSoldOutManual: dto.isSoldOutManual }
          : {}),
      },
      include: {
        recipes: {
          include: { ingredient: true },
        },
      },
    });

    return this.enrichProductStock(updated);
  }

  async remove(id: number) {
    const existing = await this.prisma.product.findUnique({
      where: { id },
      include: { recipes: true },
    });
    if (!existing) {
      throw new NotFoundException(`Không tìm thấy sản phẩm #${id}`);
    }

    await this.prisma.product.delete({ where: { id } });

    return {
      deleted: true,
      id,
      name: existing.name,
      removedRecipesCount: existing.recipes?.length ?? 0,
    };
  }
}

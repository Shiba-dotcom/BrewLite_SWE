import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  private enrichProductStock(product: any) {
    if (!product || !Array.isArray(product.recipes) || product.recipes.length === 0) {
      return {
        ...product,
        isOutOfStock: false,
        availableServings: 99,
      };
    }

    const baseRecipes = product.recipes.filter(
      (r: any) => r.size === 'S' || r.size === 'ALL',
    );
    const checkRecipes = baseRecipes.length > 0 ? baseRecipes : product.recipes;

    let minServings = Infinity;
    let outOfStock = false;

    for (const r of checkRecipes) {
      if (r.ingredient && r.amount > 0) {
        const possible = Math.floor(r.ingredient.stock / r.amount);
        if (possible < minServings) {
          minServings = possible;
        }
        if (r.ingredient.stock < r.amount) {
          outOfStock = true;
        }
      }
    }

    return {
      ...product,
      isOutOfStock: outOfStock,
      availableServings: minServings === Infinity ? 99 : Math.max(0, minServings),
    };
  }

  async findAll() {
    const products = await this.prisma.product.findMany({
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!Array.isArray(products)) return products;
    return products.map((p) => this.enrichProductStock(p));
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        recipes: {
          include: {
            ingredient: true,
          },
        },
      },
    });
    if (!product) {
      throw new NotFoundException(`Product #${id} not found`);
    }
    return this.enrichProductStock(product);
  }
}

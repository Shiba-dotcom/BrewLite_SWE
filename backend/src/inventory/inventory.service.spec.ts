import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';

describe('InventoryService — Sprint 4 (Admin BOM Warehouse, Full CRUD & Optimistic Locking)', () => {
  let service: InventoryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      ingredient: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      recipe: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      toppingRecipe: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      order: {
        findMany: vi.fn(),
      },
    };
    service = new InventoryService(mockPrisma);
  });

  it('phân loại đúng trạng thái tồn kho: OK, LOW_STOCK, và OUT_OF_STOCK', async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([
      {
        id: 1,
        code: 'ING_ROBUSTA',
        name: 'Hạt Cà phê Robusta',
        unit: 'g',
        stock: 4000,
        minThreshold: 500,
        version: 0,
      },
      {
        id: 2,
        code: 'ING_MATCHA',
        name: 'Bột Matcha Uji',
        unit: 'g',
        stock: 120,
        minThreshold: 150,
        version: 1,
      },
      {
        id: 3,
        code: 'ING_PEACH',
        name: 'Đào miếng ngâm',
        unit: 'lát',
        stock: 0,
        minThreshold: 30,
        version: 2,
      },
    ]);

    const result = await service.getAllIngredients();

    expect(result[0].status).toBe('OK');
    expect(result[1].status).toBe('LOW_STOCK');
    expect(result[2].status).toBe('OUT_OF_STOCK');
  });

  it('nhập thêm kho (restockIngredient) sử dụng Optimistic Locking tăng version', async () => {
    mockPrisma.ingredient.findUnique
      .mockResolvedValueOnce({
        id: 1,
        code: 'ING_ROBUSTA',
        name: 'Hạt Cà phê Robusta',
        unit: 'g',
        stock: 500,
        minThreshold: 500,
        version: 2,
      })
      .mockResolvedValueOnce({
        id: 1,
        code: 'ING_ROBUSTA',
        name: 'Hạt Cà phê Robusta',
        unit: 'g',
        stock: 2500,
        minThreshold: 500,
        version: 3,
      });

    mockPrisma.ingredient.updateMany.mockResolvedValue({ count: 1 });

    const res = await service.restockIngredient(1, { addAmount: 2000 });

    expect(mockPrisma.ingredient.updateMany).toHaveBeenCalledWith({
      where: { id: 1, version: 2 },
      data: {
        stock: { increment: 2000 },
        version: { increment: 1 },
      },
    });
    expect(res.stock).toBe(2500);
    expect(res.status).toBe('OK');
  });

  it('ném ConflictException khi nhập kho bị xung đột version (Optimistic Lock)', async () => {
    mockPrisma.ingredient.findUnique.mockResolvedValue({
      id: 1,
      code: 'ING_ROBUSTA',
      name: 'Hạt Cà phê Robusta',
      unit: 'g',
      stock: 500,
      minThreshold: 500,
      version: 2,
    });
    mockPrisma.ingredient.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.restockIngredient(1, { addAmount: 1000 }),
    ).rejects.toThrow(ConflictException);
  });

  it('ném NotFoundException nếu nguyên vật liệu không tồn tại', async () => {
    mockPrisma.ingredient.findUnique.mockResolvedValue(null);

    await expect(
      service.restockIngredient(999, { addAmount: 500 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('cho phép Admin thêm nguyên vật liệu mới (createIngredient) và chặn trùng mã code', async () => {
    mockPrisma.ingredient.findUnique.mockResolvedValueOnce(null);
    mockPrisma.ingredient.create.mockResolvedValue({
      id: 16,
      code: 'ING_OAT_MILK',
      name: 'Sữa Yến Mạch Oatside',
      unit: 'ml',
      stock: 5000,
      minThreshold: 500,
      version: 0,
    });

    const created = await service.createIngredient({
      code: 'ing oat milk',
      name: 'Sữa Yến Mạch Oatside',
      unit: 'ml',
      stock: 5000,
      minThreshold: 500,
    });

    expect(created.code).toBe('ING_OAT_MILK');
    expect(created.status).toBe('OK');

    mockPrisma.ingredient.findUnique.mockResolvedValueOnce({ id: 16 });
    await expect(
      service.createIngredient({
        code: 'ING_OAT_MILK',
        name: 'Trùng mã',
        unit: 'ml',
        stock: 100,
        minThreshold: 50,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('cho phép Admin thêm/cập nhật công thức BOM (upsertRecipe) và xóa dòng công thức (deleteRecipe)', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, name: 'Cà phê Đen' });
    mockPrisma.ingredient.findUnique.mockResolvedValue({ id: 1, name: 'Robusta' });
    mockPrisma.recipe.upsert.mockResolvedValue({
      id: 50,
      productId: 1,
      ingredientId: 1,
      size: 'M',
      amount: 28,
      ingredient: { id: 1, name: 'Robusta', unit: 'g' },
    });

    const upserted = await service.upsertRecipe({
      productId: 1,
      ingredientId: 1,
      size: 'm',
      amount: 28,
    });

    expect(upserted.size).toBe('M');
    expect(upserted.amount).toBe(28);

    mockPrisma.recipe.findUnique.mockResolvedValue({ id: 50 });
    mockPrisma.recipe.delete.mockResolvedValue({});
    const del = await service.deleteRecipe(50);
    expect(del.deleted).toBe(true);
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { InventoryService } from './inventory.service.js';

describe('InventoryService — Sprint 4 (Admin BOM Warehouse & Optimistic Locking)', () => {
  let service: InventoryService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      ingredient: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      product: {
        findMany: vi.fn(),
      },
      toppingRecipe: {
        findMany: vi.fn(),
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
});

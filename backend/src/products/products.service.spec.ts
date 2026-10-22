import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProductsService — Admin Menu CRUD & Visibility Management', () => {
  let service: ProductsService;
  let mockPrisma: any;

  beforeEach(async () => {
    mockPrisma = {
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      orderItem: {
        findMany: vi.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('chỉ lấy sản phẩm đang hiển thị (isActive: true) khi gọi findAll() mặc định cho khách hàng', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Cà phê Muối',
        basePrice: 42000,
        isActive: true,
        isSoldOutManual: false,
        recipes: [],
      },
    ]);

    const res = await service.findAll(false);

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
      }),
    );
    expect(res).toHaveLength(1);
    expect(res[0].isOutOfStock).toBe(false);
  });

  it('lấy toàn bộ sản phẩm (kể cả món ẩn) kèm thống kê số lần đặt khi Admin gọi findAll(true)', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Cà phê Muối',
        basePrice: 42000,
        isActive: true,
        isSoldOutManual: false,
        recipes: [{ id: 10, size: 'S', amount: 20, ingredient: { stock: 500 } }],
      },
      {
        id: 2,
        name: 'Món Đang Ẩn',
        basePrice: 39000,
        isActive: false,
        isSoldOutManual: true,
        recipes: [],
      },
    ]);
    mockPrisma.orderItem.findMany.mockResolvedValue([
      { productId: 1, quantity: 3 },
      { productId: 1, quantity: 2 },
    ]);

    const res = await service.findAll(true);

    expect(res).toHaveLength(2);
    expect(res[0].orderItemsCount).toBe(5);
    expect(res[1].isOutOfStock).toBe(true); // do isSoldOutManual = true
    expect(res[1].availableServings).toBe(0);
  });

  it('cho phép Admin tạo sản phẩm mới (create)', async () => {
    mockPrisma.product.create.mockResolvedValue({
      id: 15,
      name: 'Cold Brew Cam Vàng',
      description: 'Ủ lạnh 18 giờ thanh mát',
      basePrice: 52000,
      category: 'coldbrew',
      tag: 'Mới',
      isActive: true,
      isSoldOutManual: false,
      recipes: [],
    });

    const created = await service.create({
      name: 'Cold Brew Cam Vàng',
      description: 'Ủ lạnh 18 giờ thanh mát',
      basePrice: 52000,
      category: 'coldbrew',
      tag: 'Mới',
    });

    expect(created.id).toBe(15);
    expect(created.category).toBe('coldbrew');
    expect(created.isOutOfStock).toBe(false);
  });

  it('cho phép Admin cập nhật thông tin và bật/tắt Ẩn món hoặc Báo hết hàng thủ công (toggleVisibility)', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({ id: 1, name: 'Cà phê Đen' });
    mockPrisma.product.update.mockResolvedValue({
      id: 1,
      name: 'Cà phê Đen',
      isActive: false,
      isSoldOutManual: true,
      recipes: [],
    });

    const toggled = await service.toggleVisibility(1, {
      isActive: false,
      isSoldOutManual: true,
    });

    expect(toggled.isActive).toBe(false);
    expect(toggled.isSoldOutManual).toBe(true);
    expect(toggled.isOutOfStock).toBe(true);
  });

  it('cho phép Admin xóa sản phẩm (remove) và ném NotFoundException nếu không tồn tại', async () => {
    mockPrisma.product.findUnique.mockResolvedValueOnce({
      id: 8,
      name: 'Bánh Pain au Chocolat',
      recipes: [{ id: 101 }],
    });
    mockPrisma.product.delete.mockResolvedValue({});

    const delRes = await service.remove(8);
    expect(delRes.deleted).toBe(true);
    expect(delRes.removedRecipesCount).toBe(1);

    mockPrisma.product.findUnique.mockResolvedValueOnce(null);
    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });
});

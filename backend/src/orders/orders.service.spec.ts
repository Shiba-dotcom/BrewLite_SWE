import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: {
    order: {
      findMany: ReturnType<typeof vi.fn>;
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      order: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMyOrders (Task 9)', () => {
    it('should query orders with userId and return order list', async () => {
      const mockOrders = [
        {
          id: 101,
          status: 'PAID',
          totalAmount: 85000,
          createdAt: new Date('2026-10-17T06:00:00Z'),
          updatedAt: new Date('2026-10-17T06:01:00Z'),
          items: [{ id: 1, productName: 'Espresso', quantity: 2, unitPrice: 35000 }],
          payments: [{ id: 1, method: 'EWALLET', status: 'SUCCESS', amount: 85000 }],
        },
      ];

      prisma.order.findMany.mockResolvedValue(mockOrders);

      const result = await service.getMyOrders(1);

      expect(prisma.order.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          items: true,
          payments: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(101);
      expect(result[0].status).toBe('PAID');
    });
  });

  describe('getOrderById', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(service.getOrderById(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another user', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 102,
        userId: 2, // different user
        status: 'PAID',
        totalAmount: 50000,
        items: [],
        payments: [],
      });

      await expect(service.getOrderById(102, 1)).rejects.toThrow(ForbiddenException);
    });

    it('should return order if userId matches', async () => {
      const mockOrder = {
        id: 103,
        userId: 1,
        status: 'PAID',
        totalAmount: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
        payments: [],
      };
      prisma.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getOrderById(103, 1);
      expect(result.id).toBe(103);
      expect(result.status).toBe('PAID');
    });
  });

  describe('updateOrderStatus (Task 10)', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      prisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.updateOrderStatus(999, OrderStatus.PREPARING, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not authorized', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 104,
        userId: 2,
        status: OrderStatus.PAID,
      });

      await expect(
        service.updateOrderStatus(104, OrderStatus.PREPARING, 1),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if state transition is invalid', async () => {
      prisma.order.findUnique.mockResolvedValue({
        id: 105,
        userId: 1,
        status: OrderStatus.PAID,
      });

      // PAID -> COMPLETED is invalid (must go through PREPARING -> READY -> COMPLETED)
      await expect(
        service.updateOrderStatus(105, OrderStatus.COMPLETED, 1),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update and return new status when transition is valid', async () => {
      const now = new Date();
      prisma.order.findUnique.mockResolvedValue({
        id: 106,
        userId: 1,
        status: OrderStatus.PAID,
      });

      prisma.order.update.mockResolvedValue({
        id: 106,
        status: OrderStatus.PREPARING,
        updatedAt: now,
      });

      const result = await service.updateOrderStatus(106, OrderStatus.PREPARING, 1);

      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 106 },
        data: { status: OrderStatus.PREPARING },
      });
      expect(result.orderId).toBe(106);
      expect(result.previousStatus).toBe(OrderStatus.PAID);
      expect(result.status).toBe(OrderStatus.PREPARING);
      expect(result.updatedAt).toBe(now);
    });
  });
});

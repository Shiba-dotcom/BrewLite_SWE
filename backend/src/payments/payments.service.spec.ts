import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import { MockPaymentService } from './mock-payment.service.js';
import { assertTransition, ALLOWED_TRANSITIONS } from './state-machine.helper.js';

describe('Task 8 — Payments & State Machine Unit Tests', () => {
  describe('State Machine Guard (assertTransition)', () => {
    it('cho phép chuyển từ PENDING sang PAID', () => {
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAID)).not.toThrow();
    });

    it('cho phép chuyển từ PENDING sang PAYMENT_FAILED', () => {
      expect(() => assertTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED)).not.toThrow();
    });

    it('cho phép chuyển từ PAYMENT_FAILED sang PAID khi khách hàng thanh toán lại thành công', () => {
      expect(() => assertTransition(OrderStatus.PAYMENT_FAILED, OrderStatus.PAID)).not.toThrow();
    });

    it('chặn chuyển từ PAID ngược lại PAID hoặc PAYMENT_FAILED (ném BadRequestException)', () => {
      expect(() => assertTransition(OrderStatus.PAID, OrderStatus.PAID)).toThrow(BadRequestException);
      expect(() => assertTransition(OrderStatus.PAID, OrderStatus.PAYMENT_FAILED)).toThrow(BadRequestException);
    });

    it('chặn chuyển từ CANCELLED sang bất kỳ trạng thái nào', () => {
      expect(() => assertTransition(OrderStatus.CANCELLED, OrderStatus.PAID)).toThrow(BadRequestException);
    });
  });

  describe('MockPaymentService', () => {
    let mockPaymentService: MockPaymentService;

    beforeEach(() => {
      mockPaymentService = new MockPaymentService();
    });

    it('trả về success=true khi không có simulateFailure', async () => {
      const result = await mockPaymentService.processPayment({
        amount: 85000,
        method: PaymentMethod.EWALLET,
        simulateFailure: false,
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBeDefined();
      expect(result.message).toContain('thành công');
    });

    it('trả về success=false khi simulateFailure=true', async () => {
      const result = await mockPaymentService.processPayment({
        amount: 85000,
        method: PaymentMethod.BANK_CARD,
        simulateFailure: true,
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('bị từ chối');
    });
  });

  describe('PaymentsService Protection & Logic', () => {
    let service: PaymentsService;
    let mockPrisma: any;
    let mockPayment: any;

    beforeEach(() => {
      mockPrisma = {
        payment: {
          findUnique: vi.fn(),
          create: vi.fn(),
        },
        order: {
          findUnique: vi.fn(),
          update: vi.fn(),
        },
        $transaction: vi.fn(async (cb) => cb(mockPrisma)),
      };
      mockPayment = {
        processPayment: vi.fn(),
      };
      service = new PaymentsService(mockPrisma as any, mockPayment as any);
    });

    it('ném NotFoundException nếu đơn hàng không tồn tại', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.processPayment({ orderId: 999, method: PaymentMethod.EWALLET }, 1),
      ).rejects.toThrow(NotFoundException);
    });

    it('chống IDOR: ném ForbiddenException nếu userId không khớp với chủ đơn hàng', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 10,
        userId: 1, // Chủ đơn là User 1
        totalAmount: 50000,
        status: OrderStatus.PENDING,
      });

      await expect(
        service.processPayment({ orderId: 10, method: PaymentMethod.EWALLET }, 2), // User 2 gọi thanh toán
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

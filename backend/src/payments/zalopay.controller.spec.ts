import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';
import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';

describe('ZaloPay Integration — Service & Controller Endpoints', () => {
  let service: PaymentsService;
  let controller: PaymentsController;
  let mockPrisma: any;
  let mockPaymentService: any;
  let mockZaloPayService: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      payment: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      user: {
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    };

    mockPaymentService = {
      processPayment: vi.fn(),
    };

    mockZaloPayService = {
      createOrder: vi.fn(),
      verifyCallback: vi.fn(),
      queryStatus: vi.fn(),
    };

    service = new PaymentsService(
      mockPrisma as any,
      mockPaymentService as any,
      mockZaloPayService as any,
    );

    controller = new PaymentsController(service);
  });

  describe('POST /payments/zalopay/create', () => {
    it('gọi createZaloPayOrder và trả về link thanh toán', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 77,
        userId: 1,
        totalAmount: 110000,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
      });

      mockZaloPayService.createOrder.mockResolvedValue({
        returnCode: 1,
        returnMessage: 'Giao dịch thành công',
        orderUrl: 'https://qcgateway.zalopay.vn/pay?token=sample_token',
        appTransId: '261023_77_123456',
        zpTransToken: 'sample_token',
      });

      const req: any = { user: { userId: 1, email: 'test@brewlite.com' } };
      const res = await controller.createZaloPayOrder(req, 77);

      expect(res.returnCode).toBe(1);
      expect(res.orderUrl).toBe('https://qcgateway.zalopay.vn/pay?token=sample_token');
      expect(mockZaloPayService.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 77,
          amount: 110000,
        }),
      );
    });
  });

  describe('POST /payments/zalopay/callback', () => {
    it('tiếp nhận callback và trả về return_code: -1 nếu chữ ký MAC sai', async () => {
      mockZaloPayService.verifyCallback.mockReturnValue(false);

      const res = await controller.handleZaloPayCallback({
        data: 'tampered_data',
        mac: 'invalid_mac',
      });

      expect(res.return_code).toBe(-1);
      expect(res.return_message).toBe('mac not equal');
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });

    it('tiếp nhận callback và cập nhật đơn hàng thành PAID nếu MAC hợp lệ', async () => {
      mockZaloPayService.verifyCallback.mockReturnValue(true);

      const callbackData = {
        app_trans_id: '261023_77_998877',
        amount: 110000,
        zp_trans_id: 12345678,
        embed_data: JSON.stringify({ orderId: 77 }),
      };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 77,
        userId: 1,
        status: OrderStatus.PENDING,
        totalAmount: 110000,
      });

      mockPrisma.order.update.mockResolvedValue({ id: 77, status: OrderStatus.PAID });
      mockPrisma.payment.create.mockResolvedValue({ id: 1, status: PaymentStatus.SUCCESS });

      const res = await controller.handleZaloPayCallback({
        data: JSON.stringify(callbackData),
        mac: 'valid_mac_key2',
      });

      expect(res.return_code).toBe(1);
      expect(res.return_message).toBe('success');
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 77 },
          data: expect.objectContaining({ status: OrderStatus.PAID }),
        }),
      );
    });

    it('idempotency: trả về return_code: 1 ngay nếu đơn hàng đã PAID', async () => {
      mockZaloPayService.verifyCallback.mockReturnValue(true);

      const callbackData = {
        app_trans_id: '261023_77_998877',
        amount: 110000,
        zp_trans_id: 12345678,
        embed_data: JSON.stringify({ orderId: 77 }),
      };

      mockPrisma.order.findUnique.mockResolvedValue({
        id: 77,
        userId: 1,
        status: OrderStatus.PAID,
        totalAmount: 110000,
      });

      const res = await controller.handleZaloPayCallback({
        data: JSON.stringify(callbackData),
        mac: 'valid_mac_key2',
      });

      expect(res.return_code).toBe(1);
      expect(mockPrisma.order.update).not.toHaveBeenCalled();
    });
  });

  describe('GET /payments/zalopay/status/:orderId', () => {
    it('trả về isPaid: true ngay nếu order trong DB đã PAID', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 77,
        userId: 1,
        status: OrderStatus.PAID,
      });

      const req: any = { user: { userId: 1, email: 'test@brewlite.com' } };
      const res = await controller.getZaloPayStatus(req, 77);

      expect(res.isPaid).toBe(true);
      expect(mockZaloPayService.queryStatus).not.toHaveBeenCalled();
    });

    it('tra cứu ZaloPay queryStatus và tự động cập nhật đơn sang PAID khi nhận được tiền', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        id: 77,
        userId: 1,
        status: OrderStatus.PENDING,
        totalAmount: 110000,
      });

      mockZaloPayService.queryStatus.mockResolvedValue({
        returnCode: 1,
        isProcessing: false,
        amount: 110000,
        zpTransId: 98765432,
      });

      const req: any = { user: { userId: 1, email: 'test@brewlite.com' } };
      const res = await controller.getZaloPayStatus(req, 77, '261023_77_123456');

      expect(res.isPaid).toBe(true);
      expect(res.zpTransId).toBe(98765432);
      expect(mockPrisma.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 77 },
          data: expect.objectContaining({ status: OrderStatus.PAID }),
        }),
      );
    });
  });
});

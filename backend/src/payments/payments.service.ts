import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus, PaymentMethod } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { MockPaymentService } from './mock-payment.service.js';
import { ZaloPayService, ZaloPayCreateOrderResult, ZaloPayQueryResult } from './zalopay.service.js';
import { assertTransition } from './state-machine.helper.js';

/** Ty le quy doi Hat Vang (Task 10): 1.000 VND = 1 diem */
const POINTS_PER_VND = 1000;

export interface PaymentResponse {
  success: boolean;
  paymentId: number;
  orderId: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  amount: number;
  method: string;
  transactionId?: string;
  isIdempotent?: boolean;
  pointsEarned?: number;
  message: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mockPaymentService: MockPaymentService,
    private readonly zaloPayService: ZaloPayService,
  ) {}

  /**
   * Xu ly thanh toan don hang
   * Task 8: State Machine Guard + Idempotency Key
   * Task 10: Optimistic Locking + Loyalty Points (Hat Vang)
   */
  async processPayment(
    dto: CreatePaymentDto,
    userId: number,
    idempotencyKey?: string,
  ): Promise<PaymentResponse> {
    // 1. Kiem tra Idempotency: Neu key da ton tai va giao dich truoc da SUCCESS -> tra ve ket qua cu
    if (idempotencyKey) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
        include: { order: true },
      });

      if (existingPayment && existingPayment.status === PaymentStatus.SUCCESS) {
        this.logger.log(
          `[Idempotency] Phat hien yeu cau trung lap voi key "${idempotencyKey}". Tra ve ket qua giao dich cu.`,
        );
        return {
          success: true,
          paymentId: existingPayment.id,
          orderId: existingPayment.orderId,
          status: existingPayment.order.status,
          paymentStatus: existingPayment.status,
          amount: existingPayment.amount,
          method: existingPayment.method,
          isIdempotent: true,
          message: 'Giao dich da duoc xu ly truoc do thanh cong (Idempotent response)',
        };
      }
      // Neu key ton tai nhung FAILED -> tiep tuc xu ly lai binh thuong
    }

    // 2. Tim don hang trong DB
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Khong tim thay don hang voi ma #${dto.orderId}`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng đã bị hủy hoặc hết hạn thanh toán (quá 5 phút). Vui lòng tạo đơn mới.');
    }

    if (order.status === OrderStatus.PENDING) {
      const isExpired = Date.now() - new Date(order.createdAt).getTime() > 5 * 60 * 1000;
      if (isExpired) {
        throw new BadRequestException('Đơn hàng đã hết hạn thanh toán (quá 5 phút). Vui lòng tạo đơn mới.');
      }
    }

    // 3. Kiem tra quyen so huu don hang (chong IDOR)
    if (order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Ban khong co quyen thanh toan cho don hang nay');
    }

    // 4. Lay amount tu order.totalAmount trong DB, tuyet doi khong nhan tu client
    const paymentAmount = order.totalAmount;

    // 5. Du kien trang thai tiep theo de kiem tra State Machine Guard
    const targetStatus = dto.simulateFailure ? OrderStatus.PAYMENT_FAILED : OrderStatus.PAID;
    assertTransition(order.status, targetStatus);

    // 6. Thuc thi transaction trong Prisma de dam bao tinh toan ven (ACID)
    return await this.prisma.$transaction(async (tx) => {
      // Doc lai order trong transaction de co version hien tai
      const currentOrder = await tx.order.findUnique({
        where: { id: dto.orderId },
      });

      if (!currentOrder) {
        throw new NotFoundException(`Khong tim thay don hang #${dto.orderId}`);
      }

      // Xac thuc lai state transition trong transaction
      assertTransition(currentOrder.status, targetStatus);

      // Goi MockPaymentService
      const mockResult = await this.mockPaymentService.processPayment({
        amount: paymentAmount,
        method: dto.method,
        simulateFailure: dto.simulateFailure,
      });

      if (!mockResult.success) {
        // Thanh toan that bai

        // Task 10: Optimistic Locking - chi update neu version khop
        const failResult = await tx.order.updateMany({
          where: {
            id: currentOrder.id,
            version: currentOrder.version,
          },
          data: {
            status: OrderStatus.PAYMENT_FAILED,
            version: { increment: 1 },
          },
        });

        if (failResult.count === 0) {
          throw new ConflictException(
            `Don hang #${currentOrder.id} da bi thay doi boi mot request khac. Vui long thu lai.`,
          );
        }

        const paymentRecord = await tx.payment.create({
          data: {
            orderId: currentOrder.id,
            amount: paymentAmount,
            method: dto.method,
            status: PaymentStatus.FAILED,
            idempotencyKey: idempotencyKey || null,
          },
        });

        this.logger.warn(
          `[Payment Failed] Don hang #${currentOrder.id} thanh toan that bai. Ma Payment: #${paymentRecord.id}`,
        );

        return {
          success: false,
          paymentId: paymentRecord.id,
          orderId: currentOrder.id,
          status: OrderStatus.PAYMENT_FAILED,
          paymentStatus: paymentRecord.status,
          amount: paymentRecord.amount,
          method: paymentRecord.method,
          transactionId: mockResult.transactionId,
          message: mockResult.message,
        };
      }

      // Thanh toan thanh cong

      // Task 10: Optimistic Locking - chi update neu version khop
      const successResult = await tx.order.updateMany({
        where: {
          id: currentOrder.id,
          version: currentOrder.version,
        },
        data: {
          status: OrderStatus.PAID,
          version: { increment: 1 },
        },
      });

      if (successResult.count === 0) {
        throw new ConflictException(
          `Don hang #${currentOrder.id} da bi thay doi boi mot request khac. Vui long thu lai.`,
        );
      }

      const paymentRecord = await tx.payment.create({
        data: {
          orderId: currentOrder.id,
          amount: paymentAmount,
          method: dto.method,
          status: PaymentStatus.SUCCESS,
          idempotencyKey: idempotencyKey || null,
        },
      });

      // Task 10: Loyalty Points - Cong Hat Vang cho user (1.000 VND = 1 diem)
      const pointsEarned = Math.floor(paymentAmount / POINTS_PER_VND);

      if (pointsEarned > 0 && currentOrder.userId) {
        await tx.user.update({
          where: { id: currentOrder.userId },
          data: { loyaltyPoints: { increment: pointsEarned } },
        });
        this.logger.log(
          `[Loyalty] Don #${currentOrder.id}: Cong ${pointsEarned} Hat Vang cho User #${currentOrder.userId}`,
        );
      }

      this.logger.log(
        `[Payment Success] Don hang #${currentOrder.id} thanh toan thanh cong. Ma Payment: #${paymentRecord.id}`,
      );

      return {
        success: true,
        paymentId: paymentRecord.id,
        orderId: currentOrder.id,
        status: OrderStatus.PAID,
        paymentStatus: paymentRecord.status,
        amount: paymentRecord.amount,
        method: paymentRecord.method,
        transactionId: mockResult.transactionId,
        pointsEarned,
        message:
          pointsEarned > 0
            ? `Thanh toan thanh cong! Ban nhan duoc +${pointsEarned} Hat Vang BrewLite Club.`
            : 'Thanh toan don hang thanh cong!',
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ZaloPay Sandbox Integration (Bên thứ ba)
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Tạo Payment Link / QR code trên Cổng ZaloPay Sandbox
   */
  async createZaloPayOrder(orderId: number, userId: number): Promise<ZaloPayCreateOrderResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thực hiện thanh toán cho đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Đơn hàng #${orderId} hiện không ở trạng thái chờ thanh toán (${order.status})`);
    }

    const isExpired = Date.now() - new Date(order.createdAt).getTime() > 5 * 60 * 1000;
    if (isExpired) {
      throw new BadRequestException('Đơn hàng đã hết hạn thanh toán (quá 5 phút). Vui lòng tạo đơn mới.');
    }

    return await this.zaloPayService.createOrder({
      orderId: order.id,
      amount: order.totalAmount,
      description: `BrewLite - Thanh toan don hang #${order.id}`,
      appUser: `user_${userId}`,
    });
  }

  /**
   * Xử lý IPN Callback từ máy chủ ZaloPay (Xác thực chữ ký HMAC Key2)
   */
  async handleZaloPayCallback(body: { data: string; mac: string; type?: number }) {
    const isValid = this.zaloPayService.verifyCallback(body.data, body.mac);
    if (!isValid) {
      this.logger.error('[ZaloPay Callback] Chữ ký MAC không hợp lệ (Tampered Data)');
      return { return_code: -1, return_message: 'mac not equal' };
    }

    try {
      const dataJson = JSON.parse(body.data);
      const { app_trans_id, amount, zp_trans_id, embed_data } = dataJson;

      let orderId: number | null = null;
      if (embed_data) {
        try {
          const parsed = JSON.parse(embed_data);
          if (parsed.orderId) orderId = Number(parsed.orderId);
        } catch {}
      }

      // Fallback lấy orderId từ app_trans_id: yymmdd_orderId_random
      if (!orderId && app_trans_id) {
        const parts = app_trans_id.split('_');
        if (parts.length >= 2 && !isNaN(Number(parts[1]))) {
          orderId = Number(parts[1]);
        }
      }

      if (!orderId) {
        this.logger.error(`[ZaloPay Callback] Không trích xuất được orderId từ app_trans_id: ${app_trans_id}`);
        return { return_code: 0, return_message: 'orderId not found' };
      }

      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        this.logger.warn(`[ZaloPay Callback] Không tìm thấy đơn hàng #${orderId}`);
        return { return_code: 0, return_message: 'order not found' };
      }

      // Idempotency: nếu đơn hàng đã thanh toán thành công từ trước, trả về 1 ngay
      if (order.status === OrderStatus.PAID) {
        this.logger.log(`[ZaloPay Callback] Đơn hàng #${orderId} đã được thanh toán trước đó (Idempotent)`);
        return { return_code: 1, return_message: 'success' };
      }

      // Cập nhật trạng thái PAID trong transaction
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: orderId },
          data: {
            status: OrderStatus.PAID,
            version: { increment: 1 },
          },
        });

        await tx.payment.create({
          data: {
            orderId: order.id,
            amount: Number(amount) || order.totalAmount,
            method: PaymentMethod.EWALLET,
            status: PaymentStatus.SUCCESS,
            idempotencyKey: `ZALOPAY_${zp_trans_id || app_trans_id}`,
          },
        });

        const points = Math.floor((Number(amount) || order.totalAmount) / POINTS_PER_VND);
        if (points > 0 && order.userId) {
          await tx.user.update({
            where: { id: order.userId },
            data: { loyaltyPoints: { increment: points } },
          });
        }
      });

      this.logger.log(`[ZaloPay Callback] Đơn #${orderId} thanh toán thành công qua ZaloPay (zp_trans_id: ${zp_trans_id})`);
      return { return_code: 1, return_message: 'success' };
    } catch (err: any) {
      this.logger.error(`[ZaloPay Callback] Lỗi xử lý callback: ${err.message}`);
      return { return_code: 0, return_message: err.message };
    }
  }

  /**
   * Tra cứu trạng thái đơn hàng ZaloPay (Phục vụ Polling 3s từ Frontend)
   */
  async getZaloPayStatus(orderId: number, userId: number, appTransId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin thanh toán của đơn hàng này');
    }

    if (order.status === OrderStatus.PAID) {
      return {
        orderId: order.id,
        status: OrderStatus.PAID,
        isPaid: true,
        message: 'Đơn hàng đã được thanh toán thành công',
      };
    }

    // Nếu đơn vẫn PENDING và có appTransId, gọi trực tiếp API v2/query của ZaloPay
    if (order.status === OrderStatus.PENDING && appTransId) {
      try {
        const queryRes: ZaloPayQueryResult = await this.zaloPayService.queryStatus(appTransId);

        // ZaloPay returnCode === 1 nghĩa là đã nhận tiền thành công
        if (queryRes.returnCode === 1) {
          await this.prisma.$transaction(async (tx) => {
            const current = await tx.order.findUnique({ where: { id: orderId } });
            if (current && current.status === OrderStatus.PENDING) {
              await tx.order.update({
                where: { id: orderId },
                data: {
                  status: OrderStatus.PAID,
                  version: { increment: 1 },
                },
              });

              await tx.payment.create({
                data: {
                  orderId,
                  amount: queryRes.amount || order.totalAmount,
                  method: PaymentMethod.EWALLET,
                  status: PaymentStatus.SUCCESS,
                  idempotencyKey: `ZALOPAY_${queryRes.zpTransId || appTransId}`,
                },
              });

              const points = Math.floor((queryRes.amount || order.totalAmount) / POINTS_PER_VND);
              if (points > 0 && order.userId) {
                await tx.user.update({
                  where: { id: order.userId },
                  data: { loyaltyPoints: { increment: points } },
                });
              }
            }
          });

          return {
            orderId: order.id,
            status: OrderStatus.PAID,
            isPaid: true,
            zpTransId: queryRes.zpTransId,
            message: 'Thanh toán qua ZaloPay thành công!',
          };
        }

        return {
          orderId: order.id,
          status: order.status,
          isPaid: false,
          isProcessing: queryRes.isProcessing,
          message: queryRes.returnMessage,
        };
      } catch (err: any) {
        this.logger.warn(`[ZaloPay Polling] Không thể tra cứu trạng thái ZaloPay: ${err.message}`);
      }
    }

    return {
      orderId: order.id,
      status: order.status,
      isPaid: false,
      message: 'Đơn hàng đang chờ thanh toán',
    };
  }
}

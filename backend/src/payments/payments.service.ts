import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { MockPaymentService } from './mock-payment.service.js';
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
}

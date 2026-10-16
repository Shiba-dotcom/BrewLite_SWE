import {
  BadRequestException,
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
   * Xử lý thanh toán đơn hàng (Task 8)
   * Tích hợp State Machine Guard & Idempotency Key (chuẩn bị Task 10)
   */
  async processPayment(
    dto: CreatePaymentDto,
    userId: number,
    idempotencyKey?: string,
  ): Promise<PaymentResponse> {
    // 1. Kiểm tra Idempotency: Nếu key đã tồn tại và giao dịch trước đã SUCCESS -> trả về kết quả cũ
    if (idempotencyKey) {
      const existingPayment = await this.prisma.payment.findUnique({
        where: { idempotencyKey },
        include: { order: true },
      });

      if (existingPayment) {
        if (existingPayment.status === PaymentStatus.SUCCESS) {
          this.logger.log(
            `[Idempotency] Phát hiện yêu cầu trùng lặp với key "${idempotencyKey}". Trả về kết quả giao dịch cũ.`,
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
            message: 'Giao dịch đã được xử lý trước đó thành công (Idempotent response)',
          };
        }
        // Nếu key tồn tại nhưng không SUCCESS (ví dụ lần trước FAILED), sinh key mới hoặc tiếp tục xử lý
      }
    }

    // 2. Tìm đơn hàng trong DB
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng với mã #${dto.orderId}`);
    }

    // 3. Kiểm tra quyền sở hữu đơn hàng (chống IDOR)
    if (order.userId !== null && order.userId !== userId) {
      throw new ForbiddenException('Bạn không có quyền thanh toán cho đơn hàng này');
    }

    // 4. Lấy amount trực tiếp từ order.totalAmount trong DB, tuyệt đối không nhận từ client
    const paymentAmount = order.totalAmount;

    // 5. Dự kiến trạng thái tiếp theo để kiểm tra State Machine Guard
    const targetStatus = dto.simulateFailure ? OrderStatus.PAYMENT_FAILED : OrderStatus.PAID;
    assertTransition(order.status, targetStatus);

    // 6. Thực thi transaction trong Prisma để đảm bảo tính toàn vẹn (ACID)
    return await this.prisma.$transaction(async (tx) => {
      // Đọc lại order có lock trong transaction để tránh race condition
      const currentOrder = await tx.order.findUnique({
        where: { id: dto.orderId },
      });

      if (!currentOrder) {
        throw new NotFoundException(`Không tìm thấy đơn hàng #${dto.orderId}`);
      }

      // Xác thực lại state transition trong transaction
      assertTransition(currentOrder.status, targetStatus);

      // Gọi MockPaymentService
      const mockResult = await this.mockPaymentService.processPayment({
        amount: paymentAmount,
        method: dto.method,
        simulateFailure: dto.simulateFailure,
      });

      if (!mockResult.success) {
        // Cập nhật trạng thái đơn sang PAYMENT_FAILED
        const updatedOrder = await tx.order.update({
          where: { id: currentOrder.id },
          data: { status: OrderStatus.PAYMENT_FAILED },
        });

        // Tạo bản ghi Payment với status FAILED
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
          `[Payment Failed] Đơn hàng #${currentOrder.id} thanh toán thất bại. Mã Payment: #${paymentRecord.id}`,
        );

        return {
          success: false,
          paymentId: paymentRecord.id,
          orderId: updatedOrder.id,
          status: updatedOrder.status,
          paymentStatus: paymentRecord.status,
          amount: paymentRecord.amount,
          method: paymentRecord.method,
          transactionId: mockResult.transactionId,
          message: mockResult.message,
        };
      }

      // Thanh toán thành công: Cập nhật trạng thái đơn sang PAID
      const updatedOrder = await tx.order.update({
        where: { id: currentOrder.id },
        data: { status: OrderStatus.PAID },
      });

      // Tạo bản ghi Payment với status SUCCESS
      const paymentRecord = await tx.payment.create({
        data: {
          orderId: currentOrder.id,
          amount: paymentAmount,
          method: dto.method,
          status: PaymentStatus.SUCCESS,
          idempotencyKey: idempotencyKey || null,
        },
      });

      this.logger.log(
        `[Payment Success] Đơn hàng #${currentOrder.id} thanh toán thành công. Mã Payment: #${paymentRecord.id}`,
      );

      return {
        success: true,
        paymentId: paymentRecord.id,
        orderId: updatedOrder.id,
        status: updatedOrder.status,
        paymentStatus: paymentRecord.status,
        amount: paymentRecord.amount,
        method: paymentRecord.method,
        transactionId: mockResult.transactionId,
        message: 'Thanh toán đơn hàng thành công!',
      };
    });
  }
}

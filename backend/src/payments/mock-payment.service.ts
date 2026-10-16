import { Injectable, Logger } from '@nestjs/common';
import { PaymentMethod } from '@prisma/client';
import { randomUUID } from 'crypto';

export interface ProcessPaymentParams {
  amount: number;
  method: PaymentMethod;
  simulateFailure?: boolean;
}

export interface PaymentResult {
  success: boolean;
  transactionId: string;
  gatewayRef: string;
  message: string;
}

@Injectable()
export class MockPaymentService {
  private readonly logger = new Logger(MockPaymentService.name);

  /**
   * Giả lập xử lý thanh toán qua cổng điện tử / ngân hàng
   * Hỗ trợ cờ simulateFailure để phục vụ demo nghiệm thu Happy Path & Exception Path
   */
  async processPayment(params: ProcessPaymentParams): Promise<PaymentResult> {
    const { amount, method, simulateFailure } = params;
    const transactionId = `TXN-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
    const gatewayRef = `GW-${method}-${randomUUID().slice(0, 12).toUpperCase()}`;

    this.logger.log(
      `[MockPayment] Bắt đầu xử lý thanh toán: ${amount} VNĐ qua ${method}. simulateFailure=${Boolean(simulateFailure)}`,
    );

    // Giả lập độ trễ mạng nhẹ (300ms) để giống cổng thanh toán thực tế
    await new Promise((resolve) => setTimeout(resolve, 300));

    if (simulateFailure) {
      this.logger.warn(`[MockPayment] Giả lập thất bại thành công cho giao dịch ${transactionId}`);
      return {
        success: false,
        transactionId,
        gatewayRef,
        message: 'Giao dịch thanh toán bị từ chối bởi ngân hàng/ví điện tử (Demo Failure)',
      };
    }

    this.logger.log(`[MockPayment] Giao dịch thành công: ${transactionId} | GatewayRef: ${gatewayRef}`);
    return {
      success: true,
      transactionId,
      gatewayRef,
      message: 'Giao dịch thanh toán thành công',
    };
  }
}

import { BadRequestException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';

/**
 * Danh sách các chuyển tiếp trạng thái OrderStatus hợp lệ cho luồng thanh toán (Task 8)
 * và toàn bộ State Machine ở Task 10 (bao gồm PAID -> CANCELLED theo Mục 9.1).
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAYMENT_FAILED]: [OrderStatus.PAID, OrderStatus.PAYMENT_FAILED, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.READY],
  [OrderStatus.READY]: [OrderStatus.COMPLETED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
};

/**
 * State Machine Guard: Kiểm tra tính hợp lệ của việc chuyển đổi trạng thái đơn hàng.
 * Ném BadRequestException nếu chuyển đổi không nằm trong quy tắc cho phép.
 */
export function assertTransition(currentStatus: OrderStatus, nextStatus: OrderStatus): void {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(nextStatus)) {
    throw new BadRequestException(
      `Không thể chuyển đổi trạng thái đơn hàng từ ${currentStatus} sang ${nextStatus}. Trạng thái hiện tại không hợp lệ hoặc đơn hàng đã hoàn tất/bị hủy.`,
    );
  }
}

import { IsEnum } from 'class-validator';
import { OrderStatus } from '@prisma/client';

/**
 * DTO cho endpoint PATCH /orders/:id/status (Task 10)
 * Barista dung de cap nhat trang thai don hang thu cong
 */
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus, {
    message:
      'status phải là một trong các giá trị: PENDING, PAID, PREPARING, READY, COMPLETED, PAYMENT_FAILED, CANCELLED',
  })
  status: OrderStatus;
}

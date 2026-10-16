import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class CreatePaymentDto {
  @IsInt({ message: 'Mã đơn hàng orderId phải là số nguyên' })
  @Min(1, { message: 'Mã đơn hàng orderId phải lớn hơn hoặc bằng 1' })
  orderId: number;

  @IsEnum(PaymentMethod, {
    message: 'Phương thức thanh toán phải là EWALLET hoặc BANK_CARD',
  })
  method: PaymentMethod;

  @IsOptional()
  @IsBoolean({ message: 'simulateFailure phải là giá trị boolean (true/false)' })
  simulateFailure?: boolean;
}

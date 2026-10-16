import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreatePaymentDto } from './dto/create-payment.dto.js';
import { PaymentsService } from './payments.service.js';

interface AuthRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /payments — Thanh toán đơn hàng không tiền mặt
   * Yêu cầu JWT Bearer Token, kiểm tra quyền sở hữu đơn hàng
   * Hỗ trợ header Idempotency-Key và cờ simulateFailure để demo
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.OK)
  processPayment(
    @Request() req: AuthRequest,
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentsService.processPayment(dto, req.user.userId, idempotencyKey);
  }
}

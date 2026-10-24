import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
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
   * POST /payments — Thanh toán đơn hàng không tiền mặt (Mock Gateway / Kịch bản Demo)
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

  /**
   * POST /payments/zalopay/create — Tạo liên kết thanh toán / QR trên ZaloPay Sandbox
   */
  @UseGuards(JwtAuthGuard)
  @Post('zalopay/create')
  @HttpCode(HttpStatus.OK)
  createZaloPayOrder(
    @Request() req: AuthRequest,
    @Body('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentsService.createZaloPayOrder(orderId, req.user.userId);
  }

  /**
   * POST /payments/zalopay/callback — Tiếp nhận IPN Webhook từ máy chủ ZaloPay
   */
  @Post('zalopay/callback')
  @HttpCode(HttpStatus.OK)
  handleZaloPayCallback(@Body() body: { data: string; mac: string; type?: number }) {
    return this.paymentsService.handleZaloPayCallback(body);
  }

  /**
   * GET /payments/zalopay/status/:orderId — Kiểm tra trạng thái thanh toán ZaloPay (Polling 3s)
   */
  @UseGuards(JwtAuthGuard)
  @Get('zalopay/status/:orderId')
  @HttpCode(HttpStatus.OK)
  getZaloPayStatus(
    @Request() req: AuthRequest,
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query('appTransId') appTransId?: string,
  ) {
    return this.paymentsService.getZaloPayStatus(orderId, req.user.userId, appTransId);
  }
}

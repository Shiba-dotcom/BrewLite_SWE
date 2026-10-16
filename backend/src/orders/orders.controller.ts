import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';

interface AuthRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders — Yêu cầu JWT Bearer Token
   * userId được trích từ JWT payload, KHÔNG lấy từ body (chống IDOR)
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@Request() req: AuthRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto, req.user.userId);
  }

  /**
   * GET /orders/:id — Lấy chi tiết đơn hàng cho màn hình Checkout
   * Yêu cầu JWT Bearer Token, kiểm tra quyền sở hữu đơn hàng
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  getOrderById(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.getOrderById(id, req.user.userId);
  }
}


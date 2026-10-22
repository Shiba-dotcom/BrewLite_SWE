import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

interface AuthRequest extends Request {
  user: { userId: number; email: string; role?: Role };
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * POST /orders — Yêu cầu JWT Bearer Token
   * userId được trích từ JWT payload, KHÔNG lấy từ body (chống IDOR)
   * Trừ tồn kho nguyên vật liệu bằng Optimistic Locking trong Transaction
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  createOrder(@Request() req: AuthRequest, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(dto, req.user.userId);
  }

  /**
   * GET /orders/me — Lịch sử đơn hàng của user đang đăng nhập (Task 9)
   * Phải đặt TRƯỚC :id để NestJS không hiểu 'me' là param
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMyOrders(@Request() req: AuthRequest) {
    return this.ordersService.getMyOrders(req.user.userId);
  }

  /**
   * GET /orders/barista/queue — Danh sách đơn hàng cho màn hình Barista KDS (/staff)
   * Dành cho STAFF và ADMIN (Polling 3-5s)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STAFF, Role.ADMIN)
  @Get('barista/queue')
  getBaristaQueue() {
    return this.ordersService.getBaristaQueue();
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
    return this.ordersService.getOrderById(id, req.user.userId, req.user.role);
  }

  /**
   * PATCH /orders/:id/status — Cập nhật trạng thái đơn hàng (Task 10 & Sprint 4)
   * Barista/Admin: PAID → PREPARING → READY → COMPLETED hoặc CANCELLED
   * State Machine Guard chặn mọi transition không hợp lệ (BadRequestException)
   */
  @UseGuards(JwtAuthGuard)
  @Patch(':id/status')
  updateOrderStatus(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatus(
      id,
      dto.status,
      req.user.userId,
      req.user.role,
    );
  }

  /**
   * DELETE /orders/:id — Xóa đơn hàng đã hủy hoặc chưa thanh toán
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  deleteOrder(
    @Request() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.deleteOrder(id, req.user.userId, req.user.role);
  }
}

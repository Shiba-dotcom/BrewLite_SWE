import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

interface AuthRequest extends Request {
  user: { userId: number; email: string };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /auth/register */
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** POST /auth/login */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * GET /auth/me — Lấy thông tin user hiện tại kèm loyaltyPoints (Task 10)
   * Yêu cầu JWT Bearer Token
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Request() req: AuthRequest) {
    return this.authService.getProfile(req.user.userId);
  }

  /**
   * POST /auth/redeem-points — Đổi điểm Hạt Vàng lấy Voucher / Quà tặng (trừ điểm)
   * Yêu cầu JWT Bearer Token
   */
  @UseGuards(JwtAuthGuard)
  @Post('redeem-points')
  redeemPoints(
    @Request() req: AuthRequest,
    @Body() body: { points: number; description?: string },
  ) {
    return this.authService.redeemPoints(
      req.user.userId,
      Number(body?.points || 0),
      body?.description,
    );
  }
}


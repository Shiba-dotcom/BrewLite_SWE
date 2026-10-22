import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type { JwtPayload } from './jwt.strategy.js';

const SALT_ROUNDS = 10;

/** Dữ liệu user an toàn trả về client (ẩn passwordHash) */
function safeUser(u: {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  role?: Role;
  loyaltyPoints: number;
  createdAt: Date;
}) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role ?? Role.CUSTOMER,
    loyaltyPoints: u.loyaltyPoints,
    createdAt: u.createdAt,
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // ─── Register ────────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException(
        'Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
        phone: dto.phone ?? null,
        role: Role.CUSTOMER,
      },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: safeUser(user),
    };
  }

  // ─── Login ───────────────────────────────────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.',
      );
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedException(
        'Email hoặc mật khẩu không chính xác. Vui lòng thử lại.',
      );
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: safeUser(user),
    };
  }

  // ─── Get Profile ─────────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return safeUser(user);
  }

  // ─── Redeem Loyalty Points ───────────────────────────────────────────────────

  async redeemPoints(userId: number, points: number, description?: string) {
    if (!points || points <= 0) {
      throw new BadRequestException('Số Hạt Vàng cần đổi phải lớn hơn 0');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    if (user.loyaltyPoints < points) {
      throw new BadRequestException(
        `Bạn không đủ Hạt Vàng (Cần ${points} Hạt Vàng, hiện có ${user.loyaltyPoints} Hạt Vàng).`,
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        loyaltyPoints: { decrement: points },
      },
    });

    return {
      success: true,
      message: `Đã đổi thành công! Trừ ${points} Hạt Vàng.`,
      remainingPoints: updated.loyaltyPoints,
      user: safeUser(updated),
    };
  }
}

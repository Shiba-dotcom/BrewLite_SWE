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
  position?: string | null;
  isActive?: boolean;
  loyaltyPoints: number;
  createdAt: Date;
  vouchers?: any[];
}) {
  return {
    id: u.id,
    email: u.email,
    fullName: u.fullName,
    phone: u.phone,
    role: u.role ?? Role.CUSTOMER,
    position: (u as any).position ?? null,
    isActive: (u as any).isActive !== false,
    loyaltyPoints: u.loyaltyPoints,
    createdAt: u.createdAt,
    vouchers: u.vouchers ?? [],
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

    if ((user as any).isActive === false) {
      throw new UnauthorizedException(
        'Tài khoản này hiện đang bị tạm khóa. Vui lòng liên hệ Quản lý cửa hàng.',
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
      include: { vouchers: true },
    });

    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }

    return safeUser(user);
  }

  // ─── Get User Vouchers ───────────────────────────────────────────────────────

  async getUserVouchers(userId: number) {
    return (this.prisma as any).userVoucher.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Redeem Loyalty Points ───────────────────────────────────────────────────

  async redeemPoints(
    userId: number,
    points: number,
    description?: string,
    voucherData?: {
      code: string;
      discountPercent: number;
      minOrderAmount?: number;
    },
  ) {
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

    return this.prisma.$transaction(async (tx) => {
      // 1. Trừ điểm Hạt Vàng
      const updated = await tx.user.update({
        where: { id: userId },
        data: {
          loyaltyPoints: { decrement: points },
        },
      });

      // 2. Cộng dồn số lượng mã voucher khả dụng (nếu đã có thì quantity + 1, chưa có thì tạo mới)
      let userVoucher = null;
      if (voucherData && voucherData.code) {
        const cleanCode = voucherData.code.trim().toUpperCase();
        const masterVoucher = await (tx as any).discountCode?.findUnique({
          where: { code: cleanCode },
        }).catch(() => null);
        const effectiveMax = masterVoucher?.maxDiscountAmount ?? (voucherData as any).maxDiscountAmount ?? null;
        const effectiveMin = masterVoucher?.minOrderAmount ?? voucherData.minOrderAmount ?? 0;
        const effectivePercent = masterVoucher?.discountPercent ?? voucherData.discountPercent;
        const existing = await (tx as any).userVoucher.findUnique({
          where: {
            userId_code: {
              userId,
              code: cleanCode,
            },
          },
        });

        if (existing) {
          userVoucher = await (tx as any).userVoucher.update({
            where: { id: existing.id },
            data: {
              quantity: { increment: 1 },
              ...(effectiveMax ? { maxDiscountAmount: effectiveMax } : {}),
            },
          });
        } else {
          userVoucher = await (tx as any).userVoucher.create({
            data: {
              userId,
              code: cleanCode,
              quantity: 1,
              discountPercent: effectivePercent,
              minOrderAmount: effectiveMin,
              maxDiscountAmount: effectiveMax,
            },
          });
        }
      }

      const allVouchers = await (tx as any).userVoucher.findMany({
        where: { userId },
      });

      const qty = userVoucher ? userVoucher.quantity : 1;
      const message = userVoucher
        ? `Đã đổi thành công! Trừ ${points} Hạt Vàng. Bạn hiện đang sở hữu x${qty} mã ${userVoucher.code}.`
        : `Đã đổi thành công! Trừ ${points} Hạt Vàng.`;

      return {
        success: true,
        message,
        remainingPoints: updated.loyaltyPoints,
        voucher: userVoucher,
        vouchers: allVouchers,
        user: {
          ...safeUser(updated),
          vouchers: allVouchers,
        },
      };
    });
  }
}

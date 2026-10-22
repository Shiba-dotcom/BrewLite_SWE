import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService - Loyalty Points Redemption & Voucher Accumulation', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
    userVoucher: {
      findUnique: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      userVoucher: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => cb(prisma)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: JwtService,
          useValue: {
            sign: vi.fn().mockReturnValue('mock-jwt-token'),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('redeemPoints', () => {
    it('throws BadRequestException if points <= 0', async () => {
      await expect(service.redeemPoints(1, 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.redeemPoints(1, -10)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.redeemPoints(999, 20)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException if user has insufficient loyalty points', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '0901234567',
        loyaltyPoints: 10,
        createdAt: new Date(),
      });

      await expect(service.redeemPoints(1, 20)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('creates a new voucher with quantity=1 if user does not own it yet', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '0901234567',
        loyaltyPoints: 50,
        createdAt: new Date(),
      });

      prisma.user.update.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '0901234567',
        loyaltyPoints: 30,
        createdAt: new Date(),
      });

      prisma.userVoucher.findUnique.mockResolvedValue(null);
      prisma.userVoucher.create.mockResolvedValue({
        id: 10,
        userId: 1,
        code: 'BREW10',
        quantity: 1,
        discountPercent: 10,
        minOrderAmount: 0,
      });
      prisma.userVoucher.findMany.mockResolvedValue([
        {
          id: 10,
          userId: 1,
          code: 'BREW10',
          quantity: 1,
          discountPercent: 10,
          minOrderAmount: 0,
        },
      ]);

      const res = await service.redeemPoints(1, 20, 'Đổi voucher BREW10', {
        code: 'BREW10',
        discountPercent: 10,
        minOrderAmount: 0,
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { loyaltyPoints: { decrement: 20 } },
      });
      expect(prisma.userVoucher.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          code: 'BREW10',
          quantity: 1,
          discountPercent: 10,
          minOrderAmount: 0,
        },
      });
      expect(res.success).toBe(true);
      expect(res.remainingPoints).toBe(30);
      expect(res.voucher.quantity).toBe(1);
    });

    it('accumulates (cộng dồn) voucher quantity if user already owns the voucher', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '0901234567',
        loyaltyPoints: 80,
        createdAt: new Date(),
      });

      prisma.user.update.mockResolvedValue({
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        phone: '0901234567',
        loyaltyPoints: 60,
        createdAt: new Date(),
      });

      // User already owns BREW10 with quantity=1
      prisma.userVoucher.findUnique.mockResolvedValue({
        id: 10,
        userId: 1,
        code: 'BREW10',
        quantity: 1,
      });
      // After accumulation: quantity becomes 2
      prisma.userVoucher.update.mockResolvedValue({
        id: 10,
        userId: 1,
        code: 'BREW10',
        quantity: 2,
        discountPercent: 10,
        minOrderAmount: 0,
      });
      prisma.userVoucher.findMany.mockResolvedValue([
        {
          id: 10,
          userId: 1,
          code: 'BREW10',
          quantity: 2,
          discountPercent: 10,
          minOrderAmount: 0,
        },
      ]);

      const res = await service.redeemPoints(1, 20, 'Đổi thêm voucher BREW10', {
        code: 'BREW10',
        discountPercent: 10,
        minOrderAmount: 0,
      });

      expect(prisma.userVoucher.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { quantity: { increment: 1 } },
      });
      expect(res.success).toBe(true);
      expect(res.voucher.quantity).toBe(2);
      expect(res.message).toContain('x2 mã BREW10');
    });
  });
});

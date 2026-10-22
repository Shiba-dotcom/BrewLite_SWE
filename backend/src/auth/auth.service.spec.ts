import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuthService - Loyalty Points Redemption', () => {
  let service: AuthService;
  let prisma: {
    user: {
      findUnique: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
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

    it('successfully deducts loyalty points and returns updated points and safe user', async () => {
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

      const res = await service.redeemPoints(1, 20, 'Đổi voucher BREW10');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          loyaltyPoints: { decrement: 20 },
        },
      });
      expect(res.success).toBe(true);
      expect(res.remainingPoints).toBe(30);
      expect(res.user.loyaltyPoints).toBe(30);
    });
  });
});

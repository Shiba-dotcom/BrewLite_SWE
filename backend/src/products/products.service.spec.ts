import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('ProductsService', () => {
  let service: ProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: { product: { findMany: vi.fn(), findUnique: vi.fn() } },
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

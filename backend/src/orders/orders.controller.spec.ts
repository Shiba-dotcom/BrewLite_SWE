import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: {
    createOrder: ReturnType<typeof vi.fn>;
    getMyOrders: ReturnType<typeof vi.fn>;
    getOrderById: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      createOrder: vi.fn(),
      getMyOrders: vi.fn(),
      getOrderById: vi.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: service,
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('getMyOrders should call service.getMyOrders with req.user.userId', async () => {
    const mockReq = { user: { userId: 5, email: 'test@example.com' } };
    service.getMyOrders.mockResolvedValue([]);

    await controller.getMyOrders(mockReq as any);

    expect(service.getMyOrders).toHaveBeenCalledWith(5);
  });
});

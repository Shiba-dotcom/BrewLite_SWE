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
    updateOrderStatus: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    service = {
      createOrder: vi.fn(),
      getMyOrders: vi.fn(),
      getOrderById: vi.fn(),
      updateOrderStatus: vi.fn(),
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

  it('updateOrderStatus should call service.updateOrderStatus with orderId, status, and userId', async () => {
    const mockReq = { user: { userId: 7, email: 'barista@brewlite.com' } };
    const mockResult = { orderId: 10, status: 'PREPARING' };
    service.updateOrderStatus.mockResolvedValue(mockResult);

    const result = await controller.updateOrderStatus(
      mockReq as any,
      10,
      { status: 'PREPARING' as any },
    );

    expect(service.updateOrderStatus).toHaveBeenCalledWith(10, 'PREPARING', 7);
    expect(result).toEqual(mockResult);
  });
});

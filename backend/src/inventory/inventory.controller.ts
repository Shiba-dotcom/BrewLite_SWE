import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import {
  RestockIngredientDto,
  UpdateIngredientStockDto,
} from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /** GET /inventory/ingredients — Danh sách tồn kho nguyên vật liệu */
  @Get('ingredients')
  getAllIngredients() {
    return this.inventoryService.getAllIngredients();
  }

  /** GET /inventory/recipes — Bảng ma trận định lượng công thức BOM */
  @Get('recipes')
  getRecipeMatrix() {
    return this.inventoryService.getRecipeMatrix();
  }

  /** GET /inventory/dashboard — Thống kê quản trị (Yêu cầu ADMIN hoặc STAFF) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('dashboard')
  getDashboardStats() {
    return this.inventoryService.getDashboardStats();
  }

  /** PATCH /inventory/ingredients/:id/restock — Nhập thêm kho (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('ingredients/:id/restock')
  restockIngredient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestockIngredientDto,
  ) {
    return this.inventoryService.restockIngredient(id, dto);
  }

  /** PATCH /inventory/ingredients/:id/stock — Đặt trực tiếp tồn kho / mức cảnh báo (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('ingredients/:id/stock')
  setIngredientStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredientStockDto,
  ) {
    return this.inventoryService.setIngredientStock(id, dto);
  }
}

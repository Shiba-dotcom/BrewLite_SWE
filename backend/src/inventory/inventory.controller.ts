import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import {
  CreateIngredientDto,
  RestockIngredientDto,
  UpdateIngredientDto,
  UpdateIngredientStockDto,
  UpdateRecipeDto,
  UpdateToppingRecipeDto,
  UpsertRecipeDto,
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

  /** POST /inventory/ingredients — Thêm nguyên vật liệu mới (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('ingredients')
  createIngredient(@Body() dto: CreateIngredientDto) {
    return this.inventoryService.createIngredient(dto);
  }

  /** PATCH /inventory/ingredients/:id — Chỉnh sửa thông tin nguyên vật liệu (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('ingredients/:id')
  updateIngredient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredientDto,
  ) {
    return this.inventoryService.updateIngredient(id, dto);
  }

  /** DELETE /inventory/ingredients/:id — Xóa nguyên vật liệu (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('ingredients/:id')
  deleteIngredient(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteIngredient(id);
  }

  /** GET /inventory/recipes — Bảng ma trận định lượng công thức BOM */
  @Get('recipes')
  getRecipeMatrix() {
    return this.inventoryService.getRecipeMatrix();
  }

  /** POST /inventory/recipes — Thêm / Cập nhật định lượng nguyên liệu cho món (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('recipes')
  upsertRecipe(@Body() dto: UpsertRecipeDto) {
    return this.inventoryService.upsertRecipe(dto);
  }

  /** PATCH /inventory/recipes/:id — Điều chỉnh định lượng của dòng công thức BOM (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('recipes/:id')
  updateRecipe(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRecipeDto,
  ) {
    return this.inventoryService.updateRecipe(id, dto);
  }

  /** DELETE /inventory/recipes/:id — Xóa dòng nguyên liệu khỏi công thức món (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('recipes/:id')
  deleteRecipe(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteRecipe(id);
  }

  /** PATCH /inventory/topping-recipes/:id — Điều chỉnh định lượng Topping (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('topping-recipes/:id')
  updateToppingRecipe(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateToppingRecipeDto,
  ) {
    return this.inventoryService.updateToppingRecipe(id, dto);
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

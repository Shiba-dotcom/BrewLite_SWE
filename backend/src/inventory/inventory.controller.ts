import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import {
  CreateIngredientDto,
  CreateToppingRecipeDto,
  CreateVoucherDto,
  RestockIngredientDto,
  UpdateIngredientDto,
  UpdateIngredientStockDto,
  UpdateRecipeDto,
  UpdateSizePricingDto,
  UpdateToppingRecipeDto,
  UpdateVoucherDto,
  UpsertRecipeDto,
} from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /** GET /inventory/pricing-config — Cấu hình Giá Size, Topping & Voucher đồng bộ cho Khách hàng & Admin */
  @Get('pricing-config')
  getPublicPricingConfig() {
    return this.inventoryService.getPublicPricingConfig();
  }

  /** PATCH /inventory/size-pricing — Điều chỉnh Giá Size S / M / L chuẩn toàn quán (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('size-pricing')
  updateGlobalSizePricing(@Body() dto: UpdateSizePricingDto) {
    return this.inventoryService.updateGlobalSizePricing(dto);
  }

  /** GET /inventory/ingredients — Danh sách tồn kho nguyên vật liệu kèm đơn giá nhập */
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

  /** PATCH /inventory/ingredients/:id — Chỉnh sửa thông tin & giá nhập nguyên vật liệu (Chỉ ADMIN) */
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

  /** GET /inventory/logs — Nhật ký Nhập/Xuất Kho & Chi phí nhập hàng (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('logs')
  getInventoryLogs() {
    return this.inventoryService.getInventoryLogs();
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

  /** POST /inventory/topping-recipes — Thêm mới Topping hoặc thành phần Topping (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('topping-recipes')
  createToppingRecipe(@Body() dto: CreateToppingRecipeDto) {
    return this.inventoryService.createToppingRecipe(dto);
  }

  /** PATCH /inventory/topping-recipes/:id — Sửa giá bán, tên, mô tả, ẩn/hiện & định lượng Topping (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('topping-recipes/:id')
  updateToppingRecipe(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateToppingRecipeDto,
  ) {
    return this.inventoryService.updateToppingRecipe(id, dto);
  }

  /** DELETE /inventory/topping-recipes/:id — Xóa Topping (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('topping-recipes/:id')
  deleteToppingRecipe(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteToppingRecipe(id);
  }

  /** GET /inventory/vouchers — Danh sách Mã giảm giá / Khuyến mãi */
  @Get('vouchers')
  getAllVouchers() {
    return this.inventoryService.getAllVouchers(false);
  }

  /** POST /inventory/vouchers — Tạo mã giảm giá mới (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('vouchers')
  createVoucher(@Body() dto: CreateVoucherDto) {
    return this.inventoryService.createVoucher(dto);
  }

  /** PATCH /inventory/vouchers/:id — Sửa mã giảm giá / bật tắt trạng thái (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('vouchers/:id')
  updateVoucher(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVoucherDto,
  ) {
    return this.inventoryService.updateVoucher(id, dto);
  }

  /** DELETE /inventory/vouchers/:id — Xóa mã giảm giá (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('vouchers/:id')
  deleteVoucher(@Param('id', ParseIntPipe) id: number) {
    return this.inventoryService.deleteVoucher(id);
  }

  /** GET /inventory/dashboard — Thống kê quản trị (Yêu cầu ADMIN hoặc STAFF) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.STAFF)
  @Get('dashboard')
  getDashboardStats() {
    return this.inventoryService.getDashboardStats();
  }

  /** PATCH /inventory/ingredients/:id/restock — Nhập thêm kho kèm ghi nhật ký chi phí (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('ingredients/:id/restock')
  restockIngredient(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RestockIngredientDto,
    @Request() req: any,
  ) {
    const actor = req?.user?.email || 'Admin';
    return this.inventoryService.restockIngredient(id, dto, actor);
  }

  /** PATCH /inventory/ingredients/:id/stock — Đặt trực tiếp tồn kho / giá nhập / mức cảnh báo (Chỉ ADMIN) */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('ingredients/:id/stock')
  setIngredientStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateIngredientStockDto,
    @Request() req: any,
  ) {
    const actor = req?.user?.email || 'Admin';
    return this.inventoryService.setIngredientStock(id, dto, actor);
  }
}

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
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { UsersService } from './users.service.js';

@Controller('staff')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getAllStaff() {
    return this.usersService.getAllStaff();
  }

  @Get(':id')
  getStaffById(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getStaffById(id);
  }

  @Post()
  createStaff(@Body() dto: CreateStaffDto) {
    return this.usersService.createStaff(dto);
  }

  @Patch(':id')
  updateStaff(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStaffDto,
  ) {
    return this.usersService.updateStaff(id, dto);
  }

  @Patch(':id/status')
  toggleStaffStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.usersService.toggleStaffStatus(id, isActive);
  }

  @Delete(':id')
  deleteStaff(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteStaff(id);
  }
}

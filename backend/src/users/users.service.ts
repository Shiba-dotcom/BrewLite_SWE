import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getAllStaff() {
    const users = await this.prisma.user.findMany({
      where: {
        role: {
          in: [Role.STAFF, Role.ADMIN],
        },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        position: true,
        role: true,
        isActive: true,
        createdAt: true,
              },
      orderBy: {
        id: 'asc',
      },
    });
    return users;
  }

  async getStaffById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        position: true,
        role: true,
        isActive: true,
        createdAt: true,
              },
    });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${id}`);
    }
    return user;
  }

  async createStaff(dto: CreateStaffDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase().trim() },
    });
    if (existing) {
      throw new BadRequestException('Email này đã được sử dụng');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase().trim(),
        passwordHash: hashedPassword,
        fullName: dto.fullName.trim(),
        phone: dto.phone ? dto.phone.trim() : null,
        position: dto.position ? dto.position.trim() : 'Nhân viên',
        role: dto.role || Role.STAFF,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        position: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async updateStaff(id: number, dto: UpdateStaffDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${id}`);
    }

    if (dto.email && dto.email.toLowerCase().trim() !== user.email) {
      const emailExists = await this.prisma.user.findUnique({
        where: { email: dto.email.toLowerCase().trim() },
      });
      if (emailExists) {
        throw new BadRequestException('Email này đã được tài khoản khác sử dụng');
      }
    }

    const updateData: any = {};
    if (dto.email !== undefined) updateData.email = dto.email.toLowerCase().trim();
    if (dto.fullName !== undefined) updateData.fullName = dto.fullName.trim();
    if (dto.phone !== undefined) updateData.phone = dto.phone ? dto.phone.trim() : null;
    if (dto.position !== undefined) updateData.position = dto.position ? dto.position.trim() : null;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.password) {
      updateData.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        position: true,
        role: true,
        isActive: true,
              },
    });

    return updated;
  }

  async toggleStaffStatus(id: number, isActive: boolean) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${id}`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
      },
    });
  }

  async deleteStaff(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Không tìm thấy nhân viên với ID ${id}`);
    }

    try {
      await this.prisma.user.delete({
        where: { id },
      });
      return { success: true, message: `Đã xóa nhân viên ${user.fullName}` };
    } catch (err: any) {
      // Nếu có ràng buộc dữ liệu (đơn hàng, audits...), chuyển sang vô hiệu hóa tài khoản
      await this.prisma.user.update({
        where: { id },
        data: { isActive: false },
      });
      return {
        success: true,
        message: `Nhân viên ${user.fullName} đã có lịch sử dữ liệu hoạt động nên tài khoản đã được chuyển sang trạng thái Vô hiệu hóa/Khóa.`,
      };
    }
  }
}

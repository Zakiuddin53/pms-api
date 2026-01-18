import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AdminService } from './admin.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { ApiOperation } from '@nestjs/swagger';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('users')
  @ApiOperation({ summary: "Create" })
  async createStaff(@Req() req: Request, @Body() body: CreateStaffDto) {
    return this.adminService.createStaff(req.propertyId!, body);
  }

  @Get('users')
  @ApiOperation({ summary: "Create" })
  async listStaff(@Req() req: Request) {
    return this.adminService.listStaff(req.propertyId!);
  }
}

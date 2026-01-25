import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateStaffDto } from './dto/create-staff.dto';
import { CreateAdminDto } from './dto/create-admin.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('admins')
  @ApiOperation({ summary: 'create property admin' })
  async createAdmin(@Body() body: CreateAdminDto) {
    return this.usersService.createAdmin(body);
  }

  @Post('staff')
  @ApiOperation({ summary: 'create property staff' })
  async createStaff(@Req() req: Request, @Body() body: CreateStaffDto) {
    return this.usersService.createStaff(req.propertyId!, body);
  }

  @Get('staff')
  @ApiOperation({ summary: 'get all staff staff' })
  async listStaff(@Req() req: Request) {
    return this.usersService.listStaff(req.propertyId!);
  }
}

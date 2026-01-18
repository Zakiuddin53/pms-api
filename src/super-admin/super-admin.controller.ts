import { Body, Controller, Post } from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { SuperAdminService } from './super-admin.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('super-admin')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Post('admins')
  @ApiOperation({ summary: 'create admin' })
  async createAdmin(@Body() body: CreateAdminDto) {
    return this.superAdminService.createAdmin(body);
  }
}

import { Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@/common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '@/common/guards/super-admin.guard';
import { SuperAdminService } from './super-admin.service';

@ApiTags('Super Admin')
@Controller('super-admin')
@UseGuards(JwtAuthGuard, SuperAdminGuard)
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get('owner-requests')
  @ApiOperation({ summary: 'List pending owner signups' })
  async listOwnerRequests() {
    return this.superAdminService.listOwnerRequests();
  }

  @Patch('users/:userId/activate')
  @ApiOperation({ summary: 'Activate a user' })
  async activateUser(@Param('userId') userId: string) {
    return this.superAdminService.activateUser(Number(userId));
  }
}

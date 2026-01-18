import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { Permissions } from '../common/permissions/permissions';
import { PropertieService } from './propertie.service';
import { CreatePropertieDto } from './dto/create-propertie.dto';
import { CreatePropertyAdminDto } from './dto/create-property-admin.dto';
import { CreatePropertyStaffDto } from './dto/create-property-staff.dto';

@Controller('properties')
export class PropertieController {
  constructor(private readonly propertieService: PropertieService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTIES_CREATE)
  @Post()
  async create(@Body() createPropertieDto: CreatePropertieDto) {
    return this.propertieService.create(createPropertieDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTIES_LIST)
  @Get()
  async findAll() {
    return this.propertieService.findAll();
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_ADMINS_CREATE)
  @Post(':propertyId/admins')
  async createPropertyAdmin(
    @Param('propertyId') propertyId: string,
    @Body() body: CreatePropertyAdminDto,
  ) {
    return this.propertieService.createPropertyAdmin(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_STAFF_CREATE)
  @Post(':propertyId/staff')
  async createStaff(
    @Param('propertyId') propertyId: string,
    @Body() body: CreatePropertyStaffDto,
  ) {
    return this.propertieService.createStaff(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_USERS_READ)
  @Get(':propertyId/users')
  async listUsers(@Param('propertyId') propertyId: string) {
    return this.propertieService.listPropertyUsers(Number(propertyId));
  }
}

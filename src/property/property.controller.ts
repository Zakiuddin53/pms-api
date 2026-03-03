import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { Paginate, PaginatedSwaggerDocs } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { memoryStorage } from 'multer';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Permissions } from '../common/permissions/permissions';
import type { JwtPayload } from '../common/types/auth.types';
import { CreatePropertyAdminDto } from './dto/create-property-admin.dto';
import { CreatePropertyStaffDto } from './dto/create-property-staff.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { PropertyService } from './property.service';
import { UpdatePropertyDto } from './dto/update-propertie.dto';
import { PROPERTY_PAGINATION_CONFIG } from './property.pagination';
import { Property } from './entities/property.entity';

@ApiTags('Property')
@Controller('property')
export class PropertyController {
  constructor(private readonly propertyService: PropertyService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTIES_CREATE)
  @Post()
  @ApiOperation({ summary: 'Create a new property' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() createPropertyDto: CreatePropertyDto,
  ) {
    const ownerId = Number(user.sub);
    return this.propertyService.create(ownerId, createPropertyDto);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTIES_UPDATE)
  @Post(':propertyId/images')
  @ApiOperation({ summary: 'Upload or replace images for a property' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, { storage: memoryStorage() }))
  async uploadImages(
    @Param('propertyId') propertyId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.propertyService.updateImages(Number(propertyId), files);
  }

  @Get()
  @ApiOperation({ summary: 'Get All' })
  @PaginatedSwaggerDocs(Property, PROPERTY_PAGINATION_CONFIG)
  async findAll(@Paginate() query: PaginateQuery) {
    return this.propertyService.paginate(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'get single' })
  async getById(@Param('id') id: string) {
    return this.propertyService.getById(Number(id));
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTIES_UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'Update' })
  async update(
    @Param('id') id: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(Number(id), updatePropertyDto);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_ADMINS_CREATE)
  @Post(':propertyId/admins')
  @ApiOperation({ summary: 'Add an admin to a property' })
  async createPropertyAdmin(
    @Param('propertyId') propertyId: string,
    @Body() body: CreatePropertyAdminDto,
  ) {
    return this.propertyService.createPropertyAdmin(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_STAFF_CREATE)
  @Post(':propertyId/staff')
  @ApiOperation({ summary: 'Add a staff member' })
  async createStaff(
    @Param('propertyId') propertyId: string,
    @Body() body: CreatePropertyStaffDto,
  ) {
    return this.propertyService.createStaff(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_USERS_READ)
  @Get(':propertyId/users')
  @ApiOperation({ summary: 'List all users for a property' })
  async listUsers(@Param('propertyId') propertyId: string) {
    return this.propertyService.listPropertyUsers(Number(propertyId));
  }
}

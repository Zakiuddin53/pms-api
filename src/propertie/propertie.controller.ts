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
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { Permissions } from '../common/permissions/permissions';
import { PropertieService } from './propertie.service';
import { CreatePropertieDto } from './dto/create-propertie.dto';
import { UpdatePropertieDto } from './dto/update-propertie.dto';
import { CreatePropertyAdminDto } from './dto/create-property-admin.dto';
import { CreatePropertyStaffDto } from './dto/create-property-staff.dto';
import { ApiConsumes, ApiOperation } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

@Controller('properties')
export class PropertieController {
  constructor(private readonly propertieService: PropertieService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTIES_CREATE)
  @Post()
  @ApiOperation({ summary: 'create' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
    }),
  )
  async create(
    @Body() createPropertieDto: CreatePropertieDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.propertieService.create(createPropertieDto, files);
  }

  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @RequirePermission(Permissions.PROPERTIES_LIST)
  @Get()
  @ApiOperation({ summary: 'get all' })
  async findAll(@Paginate() query: PaginateQuery) {
    return this.propertieService.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'get by id' })
  async getById(@Param('id') id: string) {
    return this.propertieService.getById(Number(id));
  }

  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @RequirePermission(Permissions.PROPERTIES_UPDATE)
  @Patch(':id')
  @ApiOperation({ summary: 'update property' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updatePropertieDto: UpdatePropertieDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.propertieService.update(Number(id), updatePropertieDto, files);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_ADMINS_CREATE)
  @Post(':propertyId/admins')
  @ApiOperation({ summary: 'add admin to a property' })
  async createPropertyAdmin(
    @Param('propertyId') propertyId: string,
    @Body() body: CreatePropertyAdminDto,
  ) {
    return this.propertieService.createPropertyAdmin(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_STAFF_CREATE)
  @ApiOperation({ summary: 'add staff to a property' })
  @Post(':propertyId/staff')
  async createStaff(
    @Param('propertyId') propertyId: string,
    @Body() body: CreatePropertyStaffDto,
  ) {
    return this.propertieService.createStaff(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTY_USERS_READ)
  @ApiOperation({ summary: 'property users' })
  @Get(':propertyId/users')
  async listUsers(@Param('propertyId') propertyId: string) {
    return this.propertieService.listPropertyUsers(Number(propertyId));
  }
}

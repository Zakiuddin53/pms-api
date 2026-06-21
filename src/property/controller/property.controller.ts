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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../../common/guards/property-role.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Permissions } from '../../common/permissions/permissions';
import type { JwtPayload } from '../../common/types/auth.types';
import { CreatePropertyAdminDto } from '../dto/create-property-admin.dto';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { PropertyService } from '../services/property.service';
import { UpdatePropertyDto } from '../dto/update-propertie.dto';
import { UpdatePropertyUserDto } from '../dto/update-property-user.dto';
import { ResetPropertyUserPasswordDto } from '../dto/reset-property-user-password.dto';
import { PROPERTY_PAGINATION_CONFIG } from '../config/property.pagination';
import { Property } from '../entities/property.entity';

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
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async uploadImages(
    @Param('propertyId') propertyId: string,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.propertyService.updateImages(Number(propertyId), files);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  @ApiOperation({ summary: 'List properties for current user' })
  async mine(@CurrentUser() user: JwtPayload) {
    return this.propertyService.findMine(Number(user.sub), user.role);
  }

  // @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get()
  @ApiOperation({ summary: 'Get All' })
  @PaginatedSwaggerDocs(Property, PROPERTY_PAGINATION_CONFIG)
  async findAll(@Paginate() query: PaginateQuery) {
    return this.propertyService.paginate(query);
  }

  // @UseGuards(JwtAuthGuard, PropertyRoleGuard)
  @Get(':propertyId')
  @ApiOperation({ summary: 'get single' })
  async getById(@Param('propertyId') propertyId: string) {
    return this.propertyService.getById(Number(propertyId));
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PROPERTIES_UPDATE)
  @Patch(':propertyId')
  @ApiOperation({ summary: 'Update' })
  async update(
    @Param('propertyId') propertyId: string,
    @Body() updatePropertyDto: UpdatePropertyDto,
  ) {
    return this.propertyService.update(Number(propertyId), updatePropertyDto);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post(':propertyId/admins')
  @ApiOperation({ summary: 'Add an admin to a property' })
  async createPropertyAdmin(
    @Param('propertyId') propertyId: string,
    @Body() body: CreatePropertyAdminDto,
  ) {
    return this.propertyService.createPropertyAdmin(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Get(':propertyId/users')
  @ApiOperation({ summary: 'List all users for a property' })
  async listUsers(@Param('propertyId') propertyId: string) {
    return this.propertyService.listPropertyUsers(Number(propertyId));
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Patch(':propertyId/users/:userId')
  @ApiOperation({ summary: 'Update user access permissions' })
  async updatePropertyUser(
    @Param('propertyId') propertyId: string,
    @Param('userId') userId: string,
    @Body() body: UpdatePropertyUserDto,
  ) {
    return this.propertyService.updatePropertyUser(
      Number(propertyId),
      Number(userId),
      body,
    );
  }

  @UseGuards(JwtAuthGuard, SuperAdminGuard)
  @Post(':propertyId/users/:userId/reset-password')
  @ApiOperation({ summary: 'Reset a staff password for a property' })
  async resetPropertyUserPassword(
    @Param('propertyId') propertyId: string,
    @Param('userId') userId: string,
    @Body() body: ResetPropertyUserPasswordDto,
  ) {
    return this.propertyService.resetPropertyUserPassword(
      Number(propertyId),
      Number(userId),
      body,
    );
  }
}

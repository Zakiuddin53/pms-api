import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../../common/guards/property-role.guard';
import { Permissions } from '../../common/permissions/permissions';
import { CreateRoomTypeDto } from './dto/create-room-type.dto';
import { UpdateRoomTypeDto } from './dto/update-room-type.dto';
import { RoomTypesService } from './room-types.service';

@ApiTags('Inventory - Room Types')
@Controller('properties/:propertyId/room-types')
export class RoomTypesController {
  constructor(private readonly roomTypesService: RoomTypesService) {}

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_TYPES_CREATE)
  @ApiOperation({ summary: 'create room type' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @Post()
  async create(
    @Param('propertyId') propertyId: string,
    @Body() body: CreateRoomTypeDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomTypesService.create(Number(propertyId), body, files);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_TYPES_READ)
  @Get()
  async list(
    @Param('propertyId') propertyId: string,
    @Paginate() query: PaginateQuery,
  ) {
    return this.roomTypesService.list(Number(propertyId), query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_TYPES_READ)
  @Get(':roomTypeId')
  async getById(
    @Param('propertyId') propertyId: string,
    @Param('roomTypeId') roomTypeId: string,
  ) {
    return this.roomTypesService.getById(
      Number(propertyId),
      Number(roomTypeId),
    );
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_TYPES_UPDATE)
  @ApiOperation({ summary: 'Update a room type' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  @Patch(':roomTypeId')
  async update(
    @Param('propertyId') propertyId: string,
    @Param('roomTypeId') roomTypeId: string,
    @Body() body: UpdateRoomTypeDto,
    @UploadedFiles() files: Express.Multer.File[],
  ) {
    return this.roomTypesService.update(
      Number(propertyId),
      Number(roomTypeId),
      body,
      files,
    );
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_TYPES_DELETE)
  @Delete(':roomTypeId')
  async remove(
    @Param('propertyId') propertyId: string,
    @Param('roomTypeId') roomTypeId: string,
  ) {
    return this.roomTypesService.remove(Number(propertyId), Number(roomTypeId));
  }
}

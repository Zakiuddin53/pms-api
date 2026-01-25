import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../../common/guards/property-role.guard';
import { Permissions } from '../../common/permissions/permissions';
import { CreateRoomBlockDto } from './dto/create-room-block.dto';
import { UpdateRoomBlockDto } from './dto/update-room-block.dto';
import { RoomBlocksService } from './room-blocks.service';

@Controller('properties/:propertyId/blocks')
export class RoomBlocksController {
  constructor(private readonly roomBlocksService: RoomBlocksService) {}

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_BLOCKS_CREATE)
  @Post()
  async create(
    @Param('propertyId') propertyId: string,
    @Body() body: CreateRoomBlockDto,
  ) {
    return this.roomBlocksService.create(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_BLOCKS_READ)
  @Get()
  async list(
    @Param('propertyId') propertyId: string,
    @Paginate() query: PaginateQuery,
  ) {
    return this.roomBlocksService.list(Number(propertyId), query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_BLOCKS_READ)
  @Get(':blockId')
  async getById(
    @Param('propertyId') propertyId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.roomBlocksService.getById(Number(propertyId), Number(blockId));
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_BLOCKS_UPDATE)
  @Patch(':blockId')
  async update(
    @Param('propertyId') propertyId: string,
    @Param('blockId') blockId: string,
    @Body() body: UpdateRoomBlockDto,
  ) {
    return this.roomBlocksService.update(Number(propertyId), Number(blockId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOM_BLOCKS_DELETE)
  @Delete(':blockId')
  async remove(
    @Param('propertyId') propertyId: string,
    @Param('blockId') blockId: string,
  ) {
    return this.roomBlocksService.remove(Number(propertyId), Number(blockId));
  }
}

import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../../common/guards/property-role.guard';
import { Permissions } from '../../common/permissions/permissions';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';
import { ApiOperation } from '@nestjs/swagger';

@Controller('properties/:propertyId/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOMS_CREATE)
  @ApiOperation({ summary: 'add room' })
  @Post()
  async create(@Param('propertyId') propertyId: string, @Body() body: CreateRoomDto) {
    return this.roomsService.create(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOMS_READ)
  @Get()
  async list(
    @Param('propertyId') propertyId: string,
    @Paginate() query: PaginateQuery,
  ) {
    return this.roomsService.list(Number(propertyId), query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOMS_READ)
  @Get(':roomId')
  async getById(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
  ) {
    return this.roomsService.getById(Number(propertyId), Number(roomId));
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOMS_UPDATE)
  @Patch(':roomId')
  async update(
    @Param('propertyId') propertyId: string,
    @Param('roomId') roomId: string,
    @Body() body: UpdateRoomDto,
  ) {
    return this.roomsService.update(Number(propertyId), Number(roomId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.ROOMS_DELETE)
  @Delete(':roomId')
  async remove(@Param('propertyId') propertyId: string, @Param('roomId') roomId: string) {
    return this.roomsService.remove(Number(propertyId), Number(roomId));
  }
}

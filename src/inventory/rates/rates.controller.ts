import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { Paginate } from 'nestjs-paginate';
import type { PaginateQuery } from 'nestjs-paginate';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../../common/guards/property-role.guard';
import { Permissions } from '../../common/permissions/permissions';
import { CreateRateDto } from './dto/create-rate.dto';
import { UpdateRateDto } from './dto/update-rate.dto';
import { RatesService } from './rates.service';

@Controller('properties/:propertyId/rates')
export class RatesController {
  constructor(private readonly ratesService: RatesService) {}

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.RATES_CREATE)
  @Post()
  async create(@Param('propertyId') propertyId: string, @Body() body: CreateRateDto) {
    return this.ratesService.create(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.RATES_READ)
  @Get()
  async list(
    @Param('propertyId') propertyId: string,
    @Paginate() query: PaginateQuery,
  ) {
    return this.ratesService.list(Number(propertyId), query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.RATES_READ)
  @Get(':rateId')
  async getById(
    @Param('propertyId') propertyId: string,
    @Param('rateId') rateId: string,
  ) {
    return this.ratesService.getById(Number(propertyId), Number(rateId));
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.RATES_UPDATE)
  @Patch(':rateId')
  async update(
    @Param('propertyId') propertyId: string,
    @Param('rateId') rateId: string,
    @Body() body: UpdateRateDto,
  ) {
    return this.ratesService.update(Number(propertyId), Number(rateId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.RATES_DELETE)
  @Delete(':rateId')
  async remove(@Param('propertyId') propertyId: string, @Param('rateId') rateId: string) {
    return this.ratesService.remove(Number(propertyId), Number(rateId));
  }
}

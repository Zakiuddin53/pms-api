import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PropertyRoleGuard } from '../../common/guards/property-role.guard';
import { Permissions } from '../../common/permissions/permissions';
import { AvailabilityService } from './availability.service';
import { AvailabilityRangeQueryDto } from './dto/availability-query.dto';

/**
 * GET /properties/:propertyId/availability?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD[&roomTypeId=N]
 *
 * Returns per-day availability snapshots read from the room_availability table.
 * STAFF can see availability; ADMIN/SUPER_ADMIN can also see it.
 */
@ApiTags('Inventory - Availability')
@Controller('properties/:propertyId/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.AVAILABILITY_READ)
  @ApiOperation({
    summary: 'Get daily availability snapshots for a date range',
  })
  @Get()
  async getAvailability(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AvailabilityRangeQueryDto,
  ) {
    return this.availabilityService.getAvailability(propertyId, query);
  }
}

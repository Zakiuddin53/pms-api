import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { BookingsService } from './service/bookings.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { HoldBookingDto } from './dto/hold-booking.dto';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Permissions } from '../common/permissions/permissions';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags("Front Desk")
@Controller('properties/:propertyId')
export class FrontdeskController {
  constructor(private readonly bookingsService: BookingsService) {}


  
  @Get(':bookingCode')
  @ApiOperation({summary:"get booking by code"})
  async getBookingByCode(@Param('bookingCode') bookingCode: string) {
    return this.bookingsService.getBookingByCode(bookingCode);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.AVAILABILITY_READ)
  @ApiOperation({summary:"check room availiblity"})
  @Get('availability')
  async getAvailability(
    @Param('propertyId') propertyId: string,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.bookingsService.getAvailability(Number(propertyId), query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_HOLD)
  @ApiOperation({summary :"create booking"})
  @Post('bookings/hold')
  async createBooking(
    @Param('propertyId') propertyId: string,
    @Body() body: HoldBookingDto,
  ) {
    return this.bookingsService.createBooking(Number(propertyId), body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CONFIRM)
  @ApiOperation({summary:"confirm booking"})
  @Post('bookings/:bookingId/confirm')
  async confirmBooking(
    @Param('propertyId') propertyId: string,
    @Param('bookingId') bookingId: string,
    @Body() body: ConfirmBookingDto,
  ) {
    return this.bookingsService.confirmBooking(
      Number(propertyId),
      Number(bookingId),
      body,
    );
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_READ)
  @ApiOperation({summary:"get booking"})
  @Get('bookings/:bookingId')
  async getBookingById(
    @Param('propertyId') propertyId: string,
    @Param('bookingId') bookingId: string,
  ) {
    return this.bookingsService.getBookingById(
      Number(propertyId),
      Number(bookingId),
    );
  }
}

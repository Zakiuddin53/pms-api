import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './service/bookings.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { HoldBookingDto } from './dto/hold-booking.dto';
import { ListBookingsQueryDto } from './dto/list-bookings-query.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Permissions } from '../common/permissions/permissions';

@ApiTags('Bookings')
@Controller('properties/:propertyId')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @ApiOperation({ summary: 'Check room availability' })
  @Get('availability')
  async getAvailability(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: AvailabilityQueryDto,
  ) {
    return this.bookingsService.getAvailability(propertyId, query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_READ)
  @ApiOperation({ summary: 'get bookings' })
  @Get('bookings')
  async listBookings(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: ListBookingsQueryDto,
  ) {
    return this.bookingsService.listBookings(propertyId, query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_READ)
  @ApiOperation({ summary: 'Get a booking by its ID' })
  @Get('bookings/:bookingId')
  async getBookingById(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ) {
    return this.bookingsService.getBookingById(propertyId, bookingId);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_READ)
  @ApiOperation({ summary: 'Get a booking by its booking code' })
  @Get('bookings/code/:bookingCode')
  async getBookingByCode(@Param('bookingCode') bookingCode: string) {
    return this.bookingsService.getBookingByCode(bookingCode);
  }

  @ApiOperation({
    summary: 'Create a booking hold (payment required to confirm)',
  })
  @Post('bookings/hold')
  async createBooking(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() body: HoldBookingDto,
  ) {
    return this.bookingsService.createBooking(propertyId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CANCEL)
  @ApiOperation({ summary: 'Cancel a HOLD or CONFIRMED booking' })
  @Patch('bookings/:bookingId/cancel')
  async cancelBooking(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() body: CancelBookingDto,
  ) {
    return this.bookingsService.cancelBooking(propertyId, bookingId);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CHECKIN)
  @ApiOperation({ summary: 'Check in a CONFIRMED booking' })
  @Post('bookings/:bookingId/check-in')
  async checkIn(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ) {
    return this.bookingsService.checkIn(propertyId, bookingId);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CHECKOUT)
  @ApiOperation({ summary: 'Check out a CHECKED_IN booking' })
  @Post('bookings/:bookingId/check-out')
  async checkOut(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
  ) {
    return this.bookingsService.checkOut(propertyId, bookingId);
  }
}

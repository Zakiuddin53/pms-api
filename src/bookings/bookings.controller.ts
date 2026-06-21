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
import { Paginate, PaginateQuery, ApiPaginationQuery } from 'nestjs-paginate';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { BookingsService } from './service/bookings.service';
import { AvailabilityQueryDto } from './dto/availability-query.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { OnlineBookingDto } from './dto/online-booking.dto';
import { BOOKING_PAGINATION_CONFIG } from './booking-pagination.config';
import { ConfirmBookingDto } from './dto/confirm-booking.dto';
import { AddBookingPaymentDto } from './dto/add-booking-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Permissions } from '../common/permissions/permissions';
import { CheckInDto } from './dto/create-check-in.dto';
import { CheckOutDto } from './dto/check-out.dto';
import { BookingAnalyticsQueryDto } from './dto/booking-analytics-query.dto';

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
  @ApiOperation({ summary: 'Get booking analytics for a property' })
  @Get('bookings/analytics')
  async getBookingAnalytics(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Query() query: BookingAnalyticsQueryDto,
  ) {
    return this.bookingsService.getAnalytics(propertyId, query);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_READ)
  @ApiOperation({ summary: 'get bookings' })
  @ApiPaginationQuery(BOOKING_PAGINATION_CONFIG)
  @Get('bookings')
  async listBookings(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Paginate() query: PaginateQuery,
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
  async getBookingByCode(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingCode') bookingCode: string,
  ) {
    return this.bookingsService.getBookingByCode(propertyId, bookingCode);
  }

  @ApiOperation({
    summary: 'Create a booking online (Public)',
  })
  @Post('bookings/online')
  async createOnlineBooking(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() body: OnlineBookingDto,
  ) {
    return this.bookingsService.createOnlineBooking(propertyId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CREATE)
  @ApiOperation({
    summary: 'Create a booking manually (Admin)',
  })
  @Post('bookings')
  async createBooking(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() body: CreateBookingDto,
  ) {
    return this.bookingsService.createAdminBooking(propertyId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CONFIRM)
  @ApiOperation({
    summary: 'Confirm a HOLD booking for offline/frontdesk payment',
  })
  @Post('bookings/:bookingId/confirm')
  async confirmBooking(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() body: ConfirmBookingDto,
  ) {
    return this.bookingsService.confirmBooking(
      propertyId,
      bookingId,
      body.paidAmount,
    );
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PAYMENTS_CREATE)
  @ApiOperation({ summary: 'Record an offline payment for a booking' })
  @Post('bookings/:bookingId/payments')
  async addBookingPayment(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() body: AddBookingPaymentDto,
  ) {
    return this.bookingsService.addBookingPayment(propertyId, bookingId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CANCEL)
  @ApiOperation({ summary: 'Cancel a HOLD or CONFIRMED booking' })
  @Patch('bookings/:bookingId/cancel')
  async cancelBooking(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
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
    @Body() body: CheckInDto,
  ) {
    return this.bookingsService.checkIn(propertyId, bookingId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_CHECKOUT)
  @ApiOperation({ summary: 'Check out a CHECKED_IN booking' })
  @Post('bookings/:bookingId/check-out')
  async checkOut(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() body: CheckOutDto,
  ) {
    return this.bookingsService.checkOut(propertyId, bookingId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.STAY_EARLY_CHECKOUT)
  @ApiOperation({ summary: 'Early checkout a booking' })
  @Post('bookings/:bookingId/early-checkout')
  async earlyCheckout(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() body: any,
  ) {
    return this.bookingsService.earlyCheckout(propertyId, bookingId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.STAY_ROOM_CHANGE)
  @ApiOperation({ summary: 'Change room for a booking' })
  @Post('bookings/:bookingId/change-room')
  async changeRoom(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() body: any,
  ) {
    return this.bookingsService.changeRoom(propertyId, bookingId, body);
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.BOOKINGS_UPDATE)
  @ApiOperation({ summary: 'Add a secondary guest' })
  @Post('bookings/:bookingId/guests')
  async addGuest(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Param('bookingId', ParseIntPipe) bookingId: number,
    @Body() body: any,
  ) {
    return this.bookingsService.addGuest(propertyId, bookingId, body);
  }
}

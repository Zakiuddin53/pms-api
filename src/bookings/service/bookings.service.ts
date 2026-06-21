import { Injectable } from '@nestjs/common';
import { PaginateQuery } from 'nestjs-paginate';
import { AvailabilityQueryDto } from '../dto/availability-query.dto';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { OnlineBookingDto } from '../dto/online-booking.dto';
import { CheckInDto } from '../dto/create-check-in.dto';
import { CheckOutDto } from '../dto/check-out.dto';
import { ListPaymentsQueryDto } from '@/payments/dto/list-payments-query.dto';
import { AddBookingPaymentDto } from '../dto/add-booking-payment.dto';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingCreationService } from './booking-creation.service';
import { BookingGuestService } from './booking-guest.service';
import { BookingLifecycleService } from './booking-lifecycle.service';
import {
  BookingPaymentService,
  SavePaymentTransactionDto,
} from './booking-payment.service';
import { BookingQueryService } from './booking-query.service';
import { BookingAnalyticsService } from './booking-analytics.service';
import { BookingAnalyticsQueryDto } from '../dto/booking-analytics-query.dto';

@Injectable()
export class BookingsService {
  constructor(
    private readonly availabilityService: BookingAvailabilityService,
    private readonly creationService: BookingCreationService,
    private readonly guestService: BookingGuestService,
    private readonly lifecycleService: BookingLifecycleService,
    private readonly paymentService: BookingPaymentService,
    private readonly queryService: BookingQueryService,
    private readonly analyticsService: BookingAnalyticsService,
  ) {}

  getAvailability(propertyId: number, query: AvailabilityQueryDto) {
    return this.availabilityService.getAvailability(propertyId, query);
  }

  createOnlineBooking(propertyId: number, dto: OnlineBookingDto) {
    return this.creationService.createOnlineBooking(propertyId, dto);
  }

  createAdminBooking(propertyId: number, dto: CreateBookingDto) {
    return this.creationService.createAdminBooking(propertyId, dto);
  }

  getBookingById(propertyId: number, bookingId: number) {
    return this.queryService.getBookingById(propertyId, bookingId);
  }

  getBookingByCode(propertyId: number, bookingCode: string) {
    return this.queryService.getBookingByCode(propertyId, bookingCode);
  }

  getBookingByRazorpayOrderId(razorpayOrderId: string) {
    return this.queryService.getBookingByRazorpayOrderId(razorpayOrderId);
  }

  listBookings(propertyId: number, query: PaginateQuery) {
    return this.queryService.listBookings(propertyId, query);
  }

  confirmBooking(propertyId: number, bookingId: number, paidAmount?: number) {
    return this.lifecycleService.confirmBooking(
      propertyId,
      bookingId,
      paidAmount,
    );
  }

  markConfirmed(bookingId: number, paidAmount: number) {
    return this.lifecycleService.markConfirmed(bookingId, paidAmount);
  }

  cancelBooking(propertyId: number, bookingId: number) {
    return this.lifecycleService.cancelBooking(propertyId, bookingId);
  }

  checkIn(propertyId: number, bookingId: number, dto: CheckInDto) {
    return this.lifecycleService.checkIn(propertyId, bookingId, dto);
  }

  checkOut(propertyId: number, bookingId: number, dto?: CheckOutDto) {
    return this.lifecycleService.checkOut(propertyId, bookingId, dto);
  }

  earlyCheckout(propertyId: number, bookingId: number, dto: any) {
    return this.lifecycleService.earlyCheckout(propertyId, bookingId, dto);
  }

  changeRoom(propertyId: number, bookingId: number, dto: any) {
    return this.lifecycleService.changeRoom(propertyId, bookingId, dto);
  }

  addGuest(propertyId: number, bookingId: number, dto: any) {
    return this.guestService.addSecondaryGuest(bookingId, dto);
  }

  cancelExpiredHolds() {
    return this.lifecycleService.cancelExpiredHolds();
  }

  getAnalytics(propertyId: number, query: BookingAnalyticsQueryDto) {
    return this.analyticsService.getAnalytics(propertyId, query);
  }

  listPaymentTransactions(propertyId: number, query: ListPaymentsQueryDto) {
    return this.paymentService.listPaymentTransactions(propertyId, query);
  }

  savePaymentTransaction(dto: SavePaymentTransactionDto) {
    return this.paymentService.savePaymentTransaction(dto);
  }

  createPendingPaymentTransaction(
    bookingId: number,
    razorpayOrderId: string,
    amount: number,
  ) {
    return this.paymentService.createPendingPaymentTransaction(
      bookingId,
      razorpayOrderId,
      amount,
    );
  }

  getLatestCapturedPaymentTransaction(bookingId: number) {
    return this.paymentService.getLatestCapturedPaymentTransaction(bookingId);
  }

  addBookingPayment(
    propertyId: number,
    bookingId: number,
    dto: AddBookingPaymentDto,
  ) {
    return this.paymentService.addBookingPayment(propertyId, bookingId, dto);
  }
}

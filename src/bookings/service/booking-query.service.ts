import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { paginate, PaginateQuery } from 'nestjs-paginate';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { NotFoundException } from '@nestjs/common';
import { BOOKING_PAGINATION_CONFIG } from '../booking-pagination.config';

@Injectable()
export class BookingQueryService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookings: Repository<Booking>,
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactions: Repository<PaymentTransaction>,
  ) {}

  async getBookingById(propertyId: number, bookingId: number) {
    const booking = await this.bookings.findOne({
      where: { id: bookingId, propertyId },
      relations: {
        Property: true,
        Guests: { Guest: true },
        Items: {
          RoomType: true,
          Nights: true,
          AssignedRooms: {
            Room: true,
          },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getBookingByCode(propertyId: number, bookingCode: string) {
    const booking = await this.bookings.findOne({
      where: { bookingCode, propertyId },
      relations: {
        Guests: { Guest: true },
        Items: {
          RoomType: true,
          Nights: true,
          AssignedRooms: { Room: true },
        },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getBookingByRazorpayOrderId(razorpayOrderId: string) {
    const transaction = await this.paymentTransactions.findOne({
      where: { razorpayOrderId },
      relations: { Booking: true },
    });
    return transaction?.Booking ?? null;
  }

  async listBookings(propertyId: number, query: PaginateQuery) {
    return paginate(query, this.bookings, {
      ...BOOKING_PAGINATION_CONFIG,
      where: { propertyId },
    });
  }
}

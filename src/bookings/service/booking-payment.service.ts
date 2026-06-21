import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, DataSource, Repository } from 'typeorm';
import { PaymentTransaction } from '../entities/payment-transaction.entity';
import { Booking } from '../entities/booking.entity';
import { BookingLog, BookingLogAction } from '../entities/booking-log.entity';
import { BookingGuest } from '../entities/booking-guest.entity';
import { User } from '../../users/user.entity';
import { PaymentStatus } from '@/common/enums/status.enum';
import { BookingSource, BookingStatus } from '@/common/enums/booking.enum';
import { ListPaymentsQueryDto } from '@/payments/dto/list-payments-query.dto';
import { AddBookingPaymentDto } from '../dto/add-booking-payment.dto';

export interface SavePaymentTransactionDto {
  bookingId: number;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  amount: number;
}

@Injectable()
export class BookingPaymentService {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTransactions: Repository<PaymentTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Upsert a captured Razorpay payment transaction.
   * If a pending row already exists for the same order, updates it to CAPTURED.
   */
  async savePaymentTransaction(
    dto: SavePaymentTransactionDto,
  ): Promise<PaymentTransaction> {
    const existing = await this.paymentTransactions.findOne({
      where: { bookingId: dto.bookingId, razorpayOrderId: dto.razorpayOrderId },
    });

    if (existing) {
      existing.razorpayPaymentId = dto.razorpayPaymentId;
      existing.razorpaySignature = dto.razorpaySignature;
      existing.amount = dto.amount;
      existing.status = PaymentStatus.CAPTURED;
      return this.paymentTransactions.save(existing);
    }

    const tx = this.paymentTransactions.create({
      bookingId: dto.bookingId,
      razorpayOrderId: dto.razorpayOrderId,
      razorpayPaymentId: dto.razorpayPaymentId,
      razorpaySignature: dto.razorpaySignature,
      amount: dto.amount,
      status: PaymentStatus.CAPTURED,
    });
    return this.paymentTransactions.save(tx);
  }

  /**
   * Create a PENDING transaction row when initiating a Razorpay order.
   * Idempotent — returns existing row if it already exists.
   */
  async createPendingPaymentTransaction(
    bookingId: number,
    razorpayOrderId: string,
    amount: number,
  ): Promise<PaymentTransaction> {
    const existing = await this.paymentTransactions.findOne({
      where: { bookingId, razorpayOrderId },
    });
    if (existing) return existing;

    const tx = this.paymentTransactions.create({
      bookingId,
      razorpayOrderId,
      amount,
      status: PaymentStatus.PENDING,
    });
    return this.paymentTransactions.save(tx);
  }

  async getLatestCapturedPaymentTransaction(
    bookingId: number,
  ): Promise<PaymentTransaction | null> {
    return this.paymentTransactions.findOne({
      where: { bookingId, status: PaymentStatus.CAPTURED },
      order: { createdAt: 'DESC' },
    });
  }

  async listPaymentTransactions(
    propertyId: number,
    query: ListPaymentsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const q = query.q?.trim();

    const qb = this.paymentTransactions
      .createQueryBuilder('payment')
      .innerJoin('payment.Booking', 'booking')
      .leftJoin(
        BookingGuest,
        'bg',
        'bg.bookingId = booking.id AND bg.isPrimary = true',
      )
      .leftJoin(User, 'guest', 'guest.id = bg.guestId')
      .where('booking.propertyId = :propertyId', { propertyId });

    if (query.status) {
      qb.andWhere('payment.status = :status', { status: query.status });
    }

    if (q) {
      qb.andWhere(
        new Brackets((subQuery) => {
          subQuery
            .where('booking.bookingCode ILIKE :q', { q: `%${q}%` })
            .orWhere('guest.name ILIKE :q', { q: `%${q}%` })
            .orWhere('guest.email ILIKE :q', { q: `%${q}%` })
            .orWhere('payment.razorpayOrderId ILIKE :q', { q: `%${q}%` })
            .orWhere('payment.razorpayPaymentId ILIKE :q', { q: `%${q}%` });
        }),
      );
    }

    qb.select([
      'payment.id AS id',
      'payment.bookingId AS "bookingId"',
      'payment.razorpayOrderId AS "razorpayOrderId"',
      'payment.razorpayPaymentId AS "razorpayPaymentId"',
      'payment.status AS status',
      'payment.amount AS amount',
      'payment.createdAt AS "createdAt"',
      'booking.bookingCode AS "bookingCode"',
      'booking.status AS "bookingStatus"',
      'booking.source AS source',
      'booking.checkIn AS "checkIn"',
      'booking.checkOut AS "checkOut"',
      'guest.name AS "guestName"',
    ])
      .orderBy('payment.createdAt', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit);

    const [rows, total] = await Promise.all([
      qb.getRawMany<{
        id: string;
        bookingId: string;
        razorpayOrderId?: string | null;
        razorpayPaymentId?: string | null;
        status: PaymentStatus;
        amount: string;
        createdAt: string;
        bookingCode: string;
        bookingStatus: BookingStatus;
        source: BookingSource;
        checkIn: string;
        checkOut: string;
        guestName: string;
      }>(),
      qb.clone().offset(undefined).limit(undefined).getCount(),
    ]);

    return {
      data: rows.map((row) => ({
        id: Number(row.id),
        bookingId: Number(row.bookingId),
        razorpayOrderId: row.razorpayOrderId ?? undefined,
        razorpayPaymentId: row.razorpayPaymentId ?? undefined,
        status: row.status,
        amount: Number(row.amount ?? 0),
        createdAt: row.createdAt,
        bookingCode: row.bookingCode,
        bookingStatus: row.bookingStatus,
        source: row.source,
        checkIn: row.checkIn,
        checkOut: row.checkOut,
        guestName: row.guestName,
      })),
      meta: {
        totalItems: total,
        itemCount: rows.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async addBookingPayment(
    propertyId: number,
    bookingId: number,
    dto: AddBookingPaymentDto,
  ) {
    const amount = Number(dto.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    return this.dataSource.transaction(async (manager) => {
      const booking = await manager.findOne(Booking, {
        where: { id: bookingId, propertyId },
      });

      if (!booking) throw new NotFoundException('Booking not found');

      if (
        [BookingStatus.CANCELLED, BookingStatus.NO_SHOW].includes(
          booking.status,
        )
      ) {
        throw new BadRequestException(
          `Cannot add payment to a ${booking.status} booking`,
        );
      }

      const balance =
        Number(booking.totalAmount ?? 0) - Number(booking.paidAmount ?? 0);
      if (amount > balance) {
        throw new BadRequestException(
          `Payment amount cannot exceed pending balance of ${balance}`,
        );
      }

      const payment = await manager.save(
        PaymentTransaction,
        manager.create(PaymentTransaction, {
          bookingId: booking.id,
          amount,
          status: PaymentStatus.CAPTURED,
          paymentMode: dto.paymentMode,
          reference: dto.reference?.trim() || undefined,
          notes: dto.notes?.trim() || undefined,
        }),
      );

      booking.paidAmount = Number(booking.paidAmount ?? 0) + amount;
      await manager.save(Booking, booking);

      await manager.save(
        BookingLog,
        manager.create(BookingLog, {
          bookingId: booking.id,
          action: BookingLogAction.PAYMENT_ADDED,
          description: `Payment of ${amount} recorded via ${dto.paymentMode}.`,
        }),
      );

      return {
        success: true,
        bookingId: booking.id,
        paidAmount: Number(booking.paidAmount),
        balanceAmount: Math.max(
          0,
          Number(booking.totalAmount) - Number(booking.paidAmount),
        ),
        payment,
      };
    });
  }
}

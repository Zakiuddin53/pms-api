import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { BookingsService } from '../bookings/service/bookings.service';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { BookingStatus } from '@/common/enums/booking.enum';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly razorpay: Razorpay;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly bookingsService: BookingsService,
  ) {
    const keyId = this.configService.get<string>('RAZORPAY_KEY_ID');
    const keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
    const webhookSecret = this.configService.get<string>(
      'RAZORPAY_WEBHOOK_SECRET',
    );

    if (!keyId || !keySecret) {
      throw new InternalServerErrorException(
        'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured',
      );
    }

    this.keySecret = keySecret;
    this.webhookSecret = webhookSecret ?? '';

    this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
  }

  async createOrder(propertyId: number, bookingId: number) {
    const booking = await this.bookingsService.getBookingById(
      propertyId,
      bookingId,
    );

    if (booking.status !== BookingStatus.HOLD) {
      throw new BadRequestException(
        `Booking is not eligible for payment (status: ${booking.status})`,
      );
    }

    if (booking.holdExpiresAt && booking.holdExpiresAt <= new Date()) {
      throw new BadRequestException('Booking hold has expired');
    }

    const receipt = `bk_${booking.id}`;

    let order: any;
    try {
      order = await this.razorpay.orders.create({
        amount: Math.round(Number(booking.totalAmount) * 100),
        currency: 'INR',
        receipt,
        notes: { bookingCode: booking.bookingCode },
      });
    } catch (err) {
      this.logger.error('Razorpay order creation failed', err);
      throw new InternalServerErrorException(
        'Failed to create payment order with Razorpay',
      );
    }

    await this.bookingsService.createPendingPaymentTransaction(
      bookingId,
      order.id as string,
      Number(booking.totalAmount),
    );

    this.logger.log(
      `Razorpay order ${order.id} created for booking ${booking.bookingCode}`,
    );

    return {
      orderId: order.id as string,
      amount: Math.round(Number(booking.totalAmount) * 100),
      currency: 'INR',
      keyId: this.configService.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  async listPropertyPayments(propertyId: number, query: ListPaymentsQueryDto) {
    return this.bookingsService.listPaymentTransactions(propertyId, query);
  }

  async verifyPayment(
    propertyId: number,
    dto: VerifyPaymentDto,
  ): Promise<{ success: boolean; bookingCode: string; status: BookingStatus }> {
    const { bookingId, razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      dto;

    if (
      !this.verifySignature(
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
      )
    ) {
      throw new BadRequestException('Invalid payment signature');
    }

    const booking = await this.bookingsService.getBookingById(
      propertyId,
      bookingId,
    );

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      return {
        success: true,
        bookingCode: booking.bookingCode,
        status: BookingStatus.CONFIRMED,
      };
    }

    await this.bookingsService.savePaymentTransaction({
      bookingId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      amount: Number(booking.totalAmount),
    });

    const confirmed = await this.bookingsService.markConfirmed(
      bookingId,
      Number(booking.totalAmount),
    );

    this.logger.log(
      `Payment verified and booking ${confirmed.bookingCode} confirmed`,
    );

    return {
      success: true,
      bookingCode: confirmed.bookingCode,
      status: BookingStatus.CONFIRMED,
    };
  }

  async handleWebhook(rawBody: string, signature: string): Promise<void> {
    if (!this.webhookSecret) {
      this.logger.warn(
        'Webhook received but RAZORPAY_WEBHOOK_SECRET is not configured',
      );
      return;
    }

    const isValid = Razorpay.validateWebhookSignature(
      rawBody,
      signature,
      this.webhookSecret,
    );

    if (!isValid) {
      this.logger.warn('Razorpay webhook signature validation failed');
      return;
    }

    let event: any;
    try {
      event = JSON.parse(rawBody);
    } catch {
      this.logger.error('Failed to parse webhook body');
      return;
    }

    if (event?.event === 'payment.captured') {
      const payment = event?.payload?.payment?.entity;
      const orderId: string | undefined = payment?.order_id;
      const paymentId: string | undefined = payment?.id;
      const amountInPaise: number = payment?.amount ?? 0;

      if (!orderId || !paymentId) {
        this.logger.warn(
          'Webhook payment.captured missing orderId or paymentId',
        );
        return;
      }

      const booking =
        await this.bookingsService.getBookingByRazorpayOrderId(orderId);

      if (!booking) {
        this.logger.warn(`Webhook: no booking found for orderId=${orderId}`);
        return;
      }

      if (booking.status === BookingStatus.CONFIRMED) {
        return;
      }

      try {
        await this.bookingsService.savePaymentTransaction({
          bookingId: booking.id,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
          razorpaySignature: 'webhook_verified',
          amount: amountInPaise / 100,
        });

        await this.bookingsService.markConfirmed(
          booking.id,
          amountInPaise / 100,
        );

        this.logger.log(
          `Booking ${booking.bookingCode} confirmed via webhook (orderId=${orderId})`,
        );
      } catch (err) {
        this.logger.error(
          `Webhook: failed to confirm booking ${booking.id}`,
          err,
        );
      }
    }
  }

  async refundPayment(
    propertyId: number,
    bookingId: number,
    amount?: number,
  ): Promise<{ success: boolean; refundId: string }> {
    const booking = await this.bookingsService.getBookingById(
      propertyId,
      bookingId,
    );

    const tx =
      await this.bookingsService.getLatestCapturedPaymentTransaction(bookingId);

    if (!tx?.razorpayPaymentId) {
      throw new BadRequestException(
        'No captured payment found for this booking',
      );
    }

    const options: any = {};

    let refund: any;
    try {
      refund = await this.razorpay.payments.refund(
        tx.razorpayPaymentId,
        options,
      );
    } catch (err) {
      this.logger.error('Razorpay refund failed', err);
      throw new InternalServerErrorException('Failed to process refund');
    }

    this.logger.log(
      `Refund ${refund.id} initiated for booking ${booking.bookingCode}`,
    );

    return { success: true, refundId: refund.id as string };
  }

  private verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const generated = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    return generated === signature;
  }
}

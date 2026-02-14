import {
    Body,
    Controller,
    Post,
    BadRequestException,
    NotFoundException,
    Headers as RequestHeaders,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { BookingsService } from '../frontdesk/service/bookings.service';
import { BookingStatus } from '../common/enums/booking-status.enum';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(
        private readonly paymentsService: PaymentsService,
        private readonly bookingsService: BookingsService,
    ) { }

    @Post('create-order')
    @ApiOperation({ summary: 'Create Razorpay Order for a Booking' })
    async createOrder(@Body() body: { bookingId: number; propertyId: number }) {
        const { bookingId, propertyId } = body;
        const booking = await this.bookingsService.getBookingById(
            propertyId,
            bookingId,
        );

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Ensure booking is in HOLD or PENDING state
        if (booking.status !== BookingStatus.HOLD) {
            throw new BadRequestException('Booking is not eligible for payment');
        }

        const order = await this.paymentsService.createOrder(
            booking.totalAmount,
            'INR',
            `bk_${booking.id}`,
        );

        // Save order ID for tracking and webhook verification
        await this.bookingsService.updateBookingRazorpayOrderId(booking.id, order.id);

        return {
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
        };
    }

    @Post('verify')
    @ApiOperation({ summary: 'Verify Razorpay Payment Signature' })
    async verifyPayment(
        @Body()
        body: {
            bookingId: number;
            propertyId: number;
            razorpayOrderId: string;
            razorpayPaymentId: string;
            razorpaySignature: string;
        },
    ) {
        const {
            bookingId,
            propertyId,
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        } = body;

        console.log(`[PaymentVerify] Start verification for Booking ${bookingId}`, { 
            razorpayOrderId, 
            razorpayPaymentId 
        });

        const isValid = this.paymentsService.verifySignature(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        );

        if (!isValid) {
            console.error(`[PaymentVerify] Invalid signature for Booking ${bookingId}`);
            throw new BadRequestException('Invalid payment signature');
        }

        // 1. Fetch current booking to get totalAmount
        const booking = await this.bookingsService.getBookingById(propertyId, bookingId);
        console.log(`[PaymentVerify] Booking ${bookingId} current status: ${booking.status}`);

        // 2. If already confirmed (e.g. via webhook), return immediately
        if (booking.status === BookingStatus.CONFIRMED) {
            console.log(`[PaymentVerify] Booking ${bookingId} already confirmed. Skipping manual confirmation.`);
            return { success: true, status: BookingStatus.CONFIRMED };
        }

        // 3. Update payment details
        await this.bookingsService.updatePaymentDetails(bookingId, {
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
        });

        // 4. Confirm booking in a SINGLE call with correct paidAmount
        try {
            await this.bookingsService.confirmBooking(
                propertyId,
                bookingId,
                {
                    paidAmount: booking.totalAmount,
                },
            );
            console.log(`[PaymentVerify] Booking ${bookingId} confirmed successfully.`);
        } catch (error) {
            console.error(`[PaymentVerify] Confirmation failed for Booking ${bookingId}:`, error.message);
            throw error;
        }

        return { success: true, status: BookingStatus.CONFIRMED };
    }

    @Post('refund')
    @ApiOperation({ summary: 'Refund a Booking' })
    async refundBooking(@Body() body: { bookingId: number; propertyId: number }) {
        const { bookingId, propertyId } = body;
        const booking = await this.bookingsService.getBookingById(
            propertyId,
            bookingId,
        );

        if (!booking || !booking.razorpayPaymentId) {
            throw new BadRequestException('Booking not found or paid');
        }

        const refund = await this.paymentsService.refundPayment(
            booking.razorpayPaymentId,
        );

        await this.bookingsService.updateRefundDetails(bookingId, {
            razorpayRefundId: refund.id,
            razorpayRefundStatus: refund.status,
        });

        return { success: true, refundId: refund.id, status: 'REFUND_INITIATED' };
    }

    @Post('webhook')
    @ApiOperation({ summary: 'Razorpay Webhook Handler' })
    async handleWebhook(
        @Body() body: any,
        @RequestHeaders('x-razorpay-signature') signature: string,
    ) {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
            console.warn('Start webhook: Secret not found');
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        const isValid = this.paymentsService.verifyWebhookSignature(
            JSON.stringify(body),
            signature,
            secret,
        );
        if (!isValid) return { status: 'invalid_signature' };

        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        const { event, payload } = body;

        if (event === 'payment.captured') {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            const payment: any = payload.payment.entity;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            const orderId: string = payment.order_id;
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
            const paymentId: string = payment.id;

            if (orderId) {
                const booking = await this.bookingsService.getBookingByRazorpayOrderId(
                    orderId,
                );
                if (booking && booking.status === BookingStatus.HOLD) {
                    await this.bookingsService.confirmBooking(
                        booking.propertyId,
                        booking.id,
                        {
                            paidAmount: booking.totalAmount,
                            totalAmount: undefined,
                        },
                    );

                    await this.bookingsService.updatePaymentDetails(booking.id, {
                        razorpayOrderId: orderId,
                        razorpayPaymentId: paymentId,
                        razorpaySignature: 'webhook_verified',
                    });
                    console.log(`Booking ${booking.id} confirmed via webhook`);
                }
            }
        }

        return { status: 'ok' };
    }
}

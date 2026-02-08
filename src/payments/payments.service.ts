import {
    Injectable,
    InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';

@Injectable()
export class PaymentsService {
    private razorpay: Razorpay;

    constructor(private readonly configService: ConfigService) {
        const key_id = this.configService.get<string>('RAZORPAY_KEY_ID');
        const key_secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');

        if (!key_id || !key_secret) {
            console.warn('Razorpay keys are missing in configuration');
        }

        this.razorpay = new Razorpay({
            key_id: key_id || 'rzp_test_placeholder', // Fallback for dev safety
            key_secret: key_secret || 'secret_placeholder',
        });
    }

    async createOrder(amount: number, currency: string = 'INR', receipt: string) {
        try {
            const options = {
                amount: Math.round(amount * 100), // Amount in paise
                currency,
                receipt,
            };
            const order = await this.razorpay.orders.create(options);
            return order;
        } catch (error) {
            console.error('Razorpay Order Creation Failed:', error);
            throw new InternalServerErrorException('Failed to create payment order');
        }
    }

    verifySignature(
        orderId: string,
        paymentId: string,
        signature: string,
    ): boolean {
        const key_secret = this.configService.get<string>('RAZORPAY_KEY_SECRET');
        if (!key_secret) {
            throw new InternalServerErrorException('Razorpay secret missing');
        }

        const hmac = crypto.createHmac('sha256', key_secret);
        hmac.update(orderId + '|' + paymentId);
        const generatedSignature = hmac.digest('hex');

        return generatedSignature === signature;
    }

    async refundPayment(paymentId: string, amount?: number) {
        try {
            const options: any = {};
            if (amount) {
                options.amount = Math.round(amount * 100); // Amount in paise
            }
            const refund = await this.razorpay.payments.refund(paymentId, options);
            return refund;
        } catch (error) {
            console.error('Razorpay Refund Failed:', error);
            throw new InternalServerErrorException('Failed to process refund');
        }
    }

    verifyWebhookSignature(
        webhookBody: string,
        webhookSignature: string,
        webhookSecret: string,
    ): boolean {
        // Razorpay SDK provides validateWebhookSignature, but we can also do it manually for transparency
        return Razorpay.validateWebhookSignature(
            webhookBody,
            webhookSignature,
            webhookSecret,
        );
    }
}

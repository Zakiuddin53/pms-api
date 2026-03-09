import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { PropertyRoleGuard } from '../common/guards/property-role.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { RequirePermission } from '../common/decorators/require-permission.decorator';
import { Permissions } from '../common/permissions/permissions';

@ApiTags('Payments')
@Controller()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Create a Razorpay order for a HOLD booking.
   * Returns { orderId, amount, currency, keyId } to pass to Razorpay Checkout.
   */
  @ApiOperation({ summary: 'Create a Razorpay payment order for a booking' })
  @Post('properties/:propertyId/payments/create-order')
  async createOrder(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() body: CreateOrderDto,
  ) {
    return this.paymentsService.createOrder(propertyId, body.bookingId);
  }

  /**
   * After the user completes payment in Razorpay Checkout, the frontend
   * sends the payment credentials here for server-side verification.
   * On success the booking is moved from HOLD → CONFIRMED.
   */
  @ApiOperation({
    summary:
      'Verify Razorpay payment signature and confirm the booking (idempotent)',
  })
  @Post('properties/:propertyId/payments/verify')
  async verifyPayment(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() body: VerifyPaymentDto,
  ) {
    return this.paymentsService.verifyPayment(propertyId, body);
  }

  /**
   * Razorpay calls this with `payment.captured` when payment is successful.
   * This runs even if the browser tab was closed – handles edge cases where
   * the verify callback was never received.
   */
  @ApiOperation({
    summary: 'Razorpay webhook handler (payment.captured event)',
  })
  @HttpCode(HttpStatus.OK)
  @Post('payments/webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    const rawBody = req.rawBody?.toString() ?? '';
    await this.paymentsService.handleWebhook(rawBody, signature ?? '');
    return { status: 'ok' };
  }

  @UseGuards(JwtAuthGuard, PropertyRoleGuard, PermissionsGuard)
  @RequirePermission(Permissions.PAYMENTS_REFUND)
  @ApiOperation({ summary: 'Refund a payment for a booking' })
  @Post('properties/:propertyId/payments/refund')
  async refundPayment(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() body: RefundPaymentDto,
  ) {
    return this.paymentsService.refundPayment(
      propertyId,
      body.bookingId,
      body.amount,
    );
  }
}

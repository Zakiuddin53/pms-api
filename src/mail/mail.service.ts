import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly resend: Resend;
  private readonly fromEmail: string;
  private readonly appUrl: string;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured');

    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.RESEND_FROM_EMAIL;
    this.appUrl = process.env.APP_URL;
  }
  async sendVerificationEmail(email: string, name: string, token: string) {
    const baseUrl = this.appUrl.replace(/\/+$/, '');
    const link = `${baseUrl}/auth/verify-email?token=${token}`;

    await this.send({
      to: email,
      subject: 'Verify your email',
      html: `
        <p>Hi ${name},</p>
        <p>Click the link below to verify your email address. The link expires in 24 hours.</p>
        <p><a href="${link}" style="padding:10px 20px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none">Verify Email</a></p>
        <p>Or copy this link: ${link}</p>
        <p>If you didn't create an account, you can ignore this email.</p>
      `,
    });
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const baseUrl = this.appUrl.replace(/\/+$/, '');
    const link = `${baseUrl}/auth/reset-password?token=${token}`;

    await this.send({
      to: email,
      subject: 'Reset your password',
      html: `
        <p>Hi ${name},</p>
        <p>Click the link below to reset your password. The link expires in 15 minutes.</p>
        <p><a href="${link}" style="padding:10px 20px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none">Reset Password</a></p>
        <p>Or copy this link: ${link}</p>
        <p>If you didn't request a password reset, you can ignore this email.</p>
      `,
    });
  }

  async sendStaffInviteEmail(
    email: string,
    name: string,
    propertyName: string,
    token: string,
  ) {
    const baseUrl = this.appUrl.replace(/\/+$/, '');
    const link = `${baseUrl}/auth/accept-invite?token=${token}`;

    await this.send({
      to: email,
      subject: `You've been invited to ${propertyName}`,
      html: `
        <p>Hi ${name},</p>
        <p>You have been added as a staff member at <strong>${propertyName}</strong>.</p>
        <p>Click the link below to set your password and activate your account. The link expires in 72 hours.</p>
        <p><a href="${link}" style="padding:10px 20px;background:#4F46E5;color:#fff;border-radius:6px;text-decoration:none">Accept Invite</a></p>
        <p>Or copy this link: ${link}</p>
        <p>If you weren't expecting this invite, you can ignore this email.</p>
      `,
    });
  }

  /**
   * Sends booking invoice/confirmation email to the guest.
   * Subject line reflects the current payment status (PAID vs pending invoice).
   */
  async sendBookingInvoice(
    email: string,
    bookingData: {
      guestName: string;
      bookingCode: string;
      propertyName: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      rooms: Array<{
        roomTypeName: string;
        roomsCount: number;
        adults: number;
        children: number;
        pricePerNight: number;
        nights: number;
        subtotal: number;
      }>;
      subTotal: number;
      taxAmount: number;
      discount?: number;
      totalAmount: number;
      paidAmount: number;
      balanceAmount: number;
      paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
      bookingStatus: string;
      isPayAtProperty?: boolean;
    },
  ) {
    const subject =
      bookingData.paymentStatus === 'PAID'
        ? `Booking Confirmation - ${bookingData.bookingCode}`
        : `Booking Invoice - ${bookingData.bookingCode}`;

    const html = this.generateInvoiceHtml(email, bookingData);

    await this.send({ to: email, subject, html });
  }

  /**
   * Generates a professional HTML invoice email template.
   */
  private generateInvoiceHtml(
    email: string,
    data: {
      guestName: string;
      bookingCode: string;
      propertyName: string;
      checkIn: string;
      checkOut: string;
      nights: number;
      rooms: Array<{
        roomTypeName: string;
        roomsCount: number;
        adults: number;
        children: number;
        pricePerNight: number;
        nights: number;
        subtotal: number;
      }>;
      subTotal: number;
      taxAmount: number;
      discount?: number;
      totalAmount: number;
      paidAmount: number;
      balanceAmount: number;
      paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
      bookingStatus: string;
      isPayAtProperty?: boolean;
    },
  ): string {
    const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;
    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
          .invoice-header { background: white; padding: 20px; border-radius: 6px; margin-bottom: 20px; }
          .invoice-details { display: flex; justify-content: space-between; margin-bottom: 20px; background: white; padding: 20px; border-radius: 6px; }
          .detail-group h3 { margin: 0 0 10px 0; font-size: 14px; color: #6b7280; text-transform: uppercase; }
          .detail-group p { margin: 5px 0; }
          .items-table { width: 100%; background: white; border-radius: 6px; overflow: hidden; margin: 20px 0; border-collapse: collapse; }
          .items-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; font-size: 14px; }
          .items-table td { padding: 12px; border-top: 1px solid #e5e7eb; }
          .totals { background: white; padding: 20px; border-radius: 6px; margin-top: 20px; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .total-row.grand { font-size: 18px; font-weight: bold; border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 12px; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; }
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-pending { background: #fef3c7; color: #92400e; }
          .status-partial { background: #dbeafe; color: #1e40af; }
          .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏨 ${data.propertyName}</h1>
            <p style="margin: 10px 0 0 0;">Booking ${data.paymentStatus === 'PAID' ? 'Confirmation' : 'Invoice'}</p>
          </div>

          <div class="content">
            <div class="invoice-header">
              <h2 style="margin: 0 0 10px 0;">Booking Code: ${data.bookingCode}</h2>
              <span class="status-badge status-${data.paymentStatus.toLowerCase()}">
                ${data.paymentStatus}
              </span>
            </div>

            <div class="invoice-details">
              <div class="detail-group">
                <h3>Guest Details</h3>
                <p><strong>${data.guestName}</strong></p>
                <p>${email}</p>
              </div>
              <div class="detail-group">
                <h3>Stay Details</h3>
                <p><strong>Check-in:</strong> ${formatDate(data.checkIn)}</p>
                <p><strong>Check-out:</strong> ${formatDate(data.checkOut)}</p>
                <p><strong>Nights:</strong> ${data.nights}</p>
              </div>
            </div>

            <table class="items-table">
              <thead>
                <tr>
                  <th>Room Type</th>
                  <th style="text-align: center;">Guests</th>
                  <th style="text-align: center;">Rooms</th>
                  <th style="text-align: right;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${data.rooms
                  .map(
                    (room) => `
                  <tr>
                    <td>
                      <strong>${room.roomTypeName}</strong><br>
                      <span style="font-size: 12px; color: #6b7280;">
                        ${formatCurrency(room.pricePerNight)}/night × ${room.nights} nights
                      </span>
                    </td>
                    <td style="text-align: center;">
                      ${room.adults} Adult${room.adults > 1 ? 's' : ''}
                      ${room.children > 0 ? `<br>${room.children} Child${room.children > 1 ? 'ren' : ''}` : ''}
                    </td>
                    <td style="text-align: center;">${room.roomsCount}</td>
                    <td style="text-align: right;"><strong>${formatCurrency(room.subtotal)}</strong></td>
                  </tr>
                `,
                  )
                  .join('')}
              </tbody>
            </table>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal</span>
                <span>${formatCurrency(data.subTotal)}</span>
              </div>
              ${
                data.discount && data.discount > 0
                  ? `
                <div class="total-row" style="color: #059669;">
                  <span>Discount</span>
                  <span>-${formatCurrency(data.discount)}</span>
                </div>
              `
                  : ''
              }
              <div class="total-row">
                <span>Tax (GST 12%)</span>
                <span>${formatCurrency(data.taxAmount)}</span>
              </div>
              <div class="total-row grand">
                <span>Total Amount</span>
                <span>${formatCurrency(data.totalAmount)}</span>
              </div>
              ${
                data.paidAmount > 0
                  ? `
                <div class="total-row" style="color: #059669;">
                  <span>Paid Amount</span>
                  <span>${formatCurrency(data.paidAmount)}</span>
                </div>
              `
                  : ''
              }
              ${
                data.balanceAmount > 0
                  ? `
                <div class="total-row" style="color: #dc2626; font-weight: 600;">
                  <span>Balance Due</span>
                  <span>${formatCurrency(data.balanceAmount)}</span>
                </div>
              `
                  : ''
              }
            </div>

            ${
              data.isPayAtProperty
                ? `
              <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #f59e0b;">
                <strong>⚠️ Payment at Property</strong>
                <p style="margin: 5px 0 0 0;">Please pay ${formatCurrency(data.balanceAmount)} upon arrival.</p>
              </div>
            `
                : ''
            }

            ${
              data.paymentStatus === 'PENDING' && !data.isPayAtProperty
                ? `
              <div style="text-align: center;">
                <a href="${this.appUrl}/bookings/${data.bookingCode}/pay" class="button">
                  Complete Payment
                </a>
              </div>
            `
                : ''
            }
          </div>

          <div class="footer">
            <p>Thank you for choosing ${data.propertyName}!</p>
            <p>For any queries, please contact us or reply to this email.</p>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
              This is an automated email. Please do not reply directly to this message.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private async send(params: { to: string; subject: string; html: string }) {
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });

      if (error) {
        this.logger.error(
          `Resend API error sending email to ${params.to}: ${error.name} - ${error.message}`,
        );
      } else {
        this.logger.log(`Email successfully sent to ${params.to}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to send email to ${params.to}: ${error.message}`,
        );
      } else {
        this.logger.error(`Failed to send email to ${params.to}`);
      }
    }
  }
}

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
    this.fromEmail = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com';
    this.appUrl = process.env.APP_URL ?? 'http://localhost:3000';
  }

  async sendVerificationEmail(email: string, name: string, token: string) {
    const link = `${this.appUrl}/auth/verify-email?token=${token}`;

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
    const link = `${this.appUrl}/auth/reset-password?token=${token}`;

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
    const link = `${this.appUrl}/auth/accept-invite?token=${token}`;

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

  private async send(params: { to: string; subject: string; html: string }) {
    try {
      await this.resend.emails.send({
        from: this.fromEmail,
        to: params.to,
        subject: params.subject,
        html: params.html,
      });
    } catch (error) {
      // Log but don't crash — email failure should not break the request
      this.logger.error(`Failed to send email to ${params.to}: ${error.message}`);
    }
  }
}

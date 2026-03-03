import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import argon2 from 'argon2';
import {
  sign,
  verify,
  type Secret,
  type SignOptions,
  type JwtPayload as JwtLibPayload,
} from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { JwtPayload } from '../common/types/auth.types';
import { User } from '../users/user.entity';
import { UserPropertyRole } from '../property/entities/user-property-role.entity';
import { MailService } from '../mail/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { PropertyRole, GlobalRole, UserRole } from '@/common/enums/role.enum';
import { UserStatus } from '@/common/enums/status.enum';

type TokenPurpose =
  | 'email-verification'
  | 'password-reset'
  | 'staff-invite'
  | 'refresh';

interface OneTimeTokenPayload extends JwtLibPayload {
  sub: string;
  purpose: TokenPurpose;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserPropertyRole)
    private readonly memberships: Repository<UserPropertyRole>,
    private readonly mailService: MailService,
  ) {}

  async onModuleInit() {
    try {
      await this.bootstrapSuperAdmin();
    } catch (error) {
      if (!(error instanceof ConflictException)) {
        this.logger.error('Failed to bootstrap super admin', error);
      }
    }
  }

  private async bootstrapSuperAdmin() {
    const email = process.env.SUPER_ADMIN_EMAIL?.toLowerCase();
    const password = process.env.SUPER_ADMIN_PASSWORD;
    const name = process.env.SUPER_ADMIN_NAME;

    if (!email || !password || !name) {
      this.logger.warn(
        'SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD / SUPER_ADMIN_NAME not set — skipping bootstrap',
      );
      return;
    }

    const existing = await this.memberships.findOne({
      where: { role: PropertyRole.SUPER_ADMIN, isActive: true },
    });
    if (existing) {
      throw new ConflictException('Super admin already exists');
    }

    const passwordHash = await argon2.hash(password);
    const user = await this.users.save(
      this.users.create({
        userRole: UserRole.STAFF,
        name,
        email,
        passwordHash,
        status: UserStatus.ACTIVE,
      }),
    );

    await this.memberships.save(
      this.memberships.create({
        userId: user.id,
        propertyId: null,
        role: PropertyRole.SUPER_ADMIN,
        isActive: true,
      }),
    );

    this.logger.log(`Super admin bootstrapped: ${email}`);
  }

  // Step 1: Property owner signs up with name, email, password.
  // Password is hashed and saved immediately. Account is PENDING until email verified.
  // A verification email is sent via Resend.

  async register(dto: RegisterDto) {
    const email = dto.email.toLowerCase();
    const existing = await this.users.findOne({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = await this.users.save(
      this.users.create({
        userRole: UserRole.STAFF,
        name: dto.name,
        email,
        passwordHash,
        status: UserStatus.PENDING,
      }),
    );

    // Create a PROPERTY_ADMIN membership with no property attached yet.
    // This marks the user as a property admin from day one — they can create
    // their first property and have staff added after email verification.
    await this.memberships.save(
      this.memberships.create({
        userId: user.id,
        propertyId: null,
        role: PropertyRole.PROPERTY_ADMIN,
        isActive: true,
      }),
    );

    const token = this.signOneTimeToken(
      String(user.id),
      'email-verification',
      '24h',
    );
    await this.mailService.sendVerificationEmail(email, dto.name, token);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const payload = this.verifyOneTimeToken(dto.token, 'email-verification');
    const userId = Number(payload.sub);

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid verification link');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException(
        'Email is already verified. You can log in.',
      );
    }

    user.status = UserStatus.ACTIVE;
    await this.users.save(user);

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email.toLowerCase();
    const user = await this.users.findOne({ where: { email } });

    if (user && user.status === UserStatus.PENDING) {
      const token = this.signOneTimeToken(
        String(user.id),
        'email-verification',
        '24h',
      );
      await this.mailService.sendVerificationEmail(email, user.name, token);
    }

    return {
      message:
        'If a pending account exists with that email, a new verification link has been sent.',
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email?.toLowerCase();
    if (!email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.users.findOne({ where: { email } });
    if (!user || user.userRole === UserRole.GUEST || !user.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.PENDING) {
      throw new UnauthorizedException(
        'Please verify your email before logging in. Check your inbox for the verification link.',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Your account is inactive. Please contact support.',
      );
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.memberships.find({
      where: { userId: user.id, isActive: true },
    });

    const jwtPayload = this.buildJwtPayload(user, memberships);
    return {
      accessToken: this.signAccessToken(jwtPayload),
      refreshToken: this.signRefreshToken(String(user.id)),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        globalRole: jwtPayload.globalRole,
        roles: jwtPayload.roles,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto) {
    let payload: OneTimeTokenPayload;
    try {
      payload = verify(
        dto.refreshToken,
        this.getRefreshSecret(),
      ) as OneTimeTokenPayload;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired refresh token. Please log in again.',
      );
    }

    if (payload.purpose !== 'refresh') {
      throw new UnauthorizedException('Invalid token');
    }

    const userId = Number(payload.sub);
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account not found or inactive.');
    }

    const memberships = await this.memberships.find({
      where: { userId: user.id, isActive: true },
    });

    const jwtPayload = this.buildJwtPayload(user, memberships);
    return {
      accessToken: this.signAccessToken(jwtPayload),
      refreshToken: this.signRefreshToken(String(user.id)), // rotate
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const email = dto.email.toLowerCase();
    const user = await this.users.findOne({ where: { email } });

    // Don't reveal whether the email exists
    if (user && user.passwordHash && user.status === UserStatus.ACTIVE) {
      const token = this.signOneTimeToken(
        String(user.id),
        'password-reset',
        '15m',
      );
      await this.mailService.sendPasswordResetEmail(email, user.name, token);
    }

    return {
      message:
        'If an account with that email exists, a reset link has been sent.',
    };
  }

  // ─── Reset Password ───────────────────────────────────────────────────────────

  async resetPassword(dto: ResetPasswordDto) {
    const payload = this.verifyOneTimeToken(dto.token, 'password-reset');
    const userId = Number(payload.sub);

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired reset link');
    }

    user.passwordHash = await argon2.hash(dto.newPassword);
    await this.users.save(user);

    return { message: 'Password updated successfully. You can now log in.' };
  }

  async acceptInvite(dto: AcceptInviteDto) {
    const payload = this.verifyOneTimeToken(dto.token, 'staff-invite');
    const userId = Number(payload.sub);

    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired invite link');
    }

    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException(
        'This invite has already been accepted. Please log in.',
      );
    }

    user.passwordHash = await argon2.hash(dto.password);
    user.status = UserStatus.ACTIVE;
    await this.users.save(user);

    const memberships = await this.memberships.find({
      where: { userId: user.id, isActive: true },
    });

    const jwtPayload = this.buildJwtPayload(user, memberships);
    return {
      accessToken: this.signAccessToken(jwtPayload),
      refreshToken: this.signRefreshToken(String(user.id)),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        globalRole: jwtPayload.globalRole,
        roles: jwtPayload.roles,
      },
    };
  }

  async me(jwtPayload: JwtPayload) {
    const user = await this.users.findOne({
      where: { id: Number(jwtPayload.sub) },
    });
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      globalRole: jwtPayload.globalRole,
      roles: jwtPayload.roles,
    };
  }

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET is not configured');
    return secret;
  }

  private getRefreshSecret(): string {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error('JWT_REFRESH_SECRET is not configured');
    return secret;
  }

  private signAccessToken(payload: JwtPayload): string {
    const expiresIn = (process.env.JWT_EXPIRES_IN ??
      '15m') as SignOptions['expiresIn'];
    return sign(payload, this.getJwtSecret() as Secret, { expiresIn });
  }

  private signRefreshToken(userId: string): string {
    const expiresIn = (process.env.JWT_REFRESH_EXPIRES_IN ??
      '7d') as SignOptions['expiresIn'];
    const payload: OneTimeTokenPayload = { sub: userId, purpose: 'refresh' };
    return sign(payload, this.getRefreshSecret() as Secret, { expiresIn });
  }

  private signOneTimeToken(
    userId: string,
    purpose: TokenPurpose,
    expiresIn: string,
  ): string {
    const payload: OneTimeTokenPayload = { sub: userId, purpose };
    return sign(payload, this.getJwtSecret() as Secret, {
      expiresIn: expiresIn as SignOptions['expiresIn'],
    });
  }

  generateInviteToken(userId: string): string {
    const payload: OneTimeTokenPayload = {
      sub: userId,
      purpose: 'staff-invite',
    };
    return sign(payload, this.getJwtSecret() as Secret, {
      expiresIn: '72h' as SignOptions['expiresIn'],
    });
  }

  private verifyOneTimeToken(
    token: string,
    expectedPurpose: TokenPurpose,
  ): OneTimeTokenPayload {
    try {
      const decoded = verify(token, this.getJwtSecret()) as OneTimeTokenPayload;

      if (decoded.purpose !== expectedPurpose) {
        throw new UnauthorizedException('Invalid token');
      }

      return decoded;
    } catch {
      throw new UnauthorizedException(
        'Invalid or expired link. Please request a new one.',
      );
    }
  }

  private buildJwtPayload(
    user: User,
    memberships: UserPropertyRole[],
  ): JwtPayload {
    const isSuperAdmin = memberships.some(
      (m) => m.role === PropertyRole.SUPER_ADMIN,
    );
    const isPropertyAdmin = memberships.some(
      (m) => m.role === PropertyRole.PROPERTY_ADMIN,
    );

    const propertyRoles = memberships
      .filter(
        (m) => m.propertyId !== null && m.role !== PropertyRole.SUPER_ADMIN,
      )
      .map((m) => ({ propertyId: m.propertyId, role: m.role }));

    let globalRole: GlobalRole;
    if (isSuperAdmin) {
      globalRole = GlobalRole.SUPER_ADMIN;
    } else if (isPropertyAdmin) {
      globalRole = GlobalRole.PROPERTY_ADMIN;
    } else {
      globalRole = GlobalRole.NONE;
    }

    return {
      sub: String(user.id),
      email: user.email,
      globalRole,
      roles: propertyRoles,
    };
  }
}

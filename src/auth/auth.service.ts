import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import argon2 from 'argon2';
import { sign, type Secret, type SignOptions } from 'jsonwebtoken';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalRole } from '../common/enums/global-role.enum';
import { PropertyRole } from '../common/enums/property-role.enum';
import type { JwtPayload } from '../common/types/auth.types';
import { User } from '../users/user.entity';
import { UserPropertyRole } from '../propertie/entities/user-property-role.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterSuperAdminDto } from './dto/register-super-admin.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(UserPropertyRole)
    private readonly memberships: Repository<UserPropertyRole>,
  ) {}

  private getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    return secret;
  }

  private getJwtExpiresIn(): string {
    return process.env.JWT_EXPIRES_IN ?? '12h';
  }

  async registerSuperAdmin(dto: RegisterSuperAdminDto) {
    const email = dto.email?.toLowerCase();
    if (!email || !dto.password || !dto.name) {
      throw new BadRequestException('Name, email, and password are required');
    }

    const existingSuperAdmin = await this.memberships.findOne({
      where: { role: PropertyRole.SUPER_ADMIN, isActive: true },
      select: { id: true },
    });
    if (existingSuperAdmin) {
      throw new BadRequestException('Super admin already exists');
    }

    const existingUser = await this.users.findOne({
      where: { email },
      select: { id: true },
    });
    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const passwordHash = await argon2.hash(dto.password);
    const user = this.users.create({
      name: dto.name,
      email,
      passwordHash,
      status: 'ACTIVE',
    });
    const saved = await this.users.save(user);

    const membership = this.memberships.create({
      userId: saved.id,
      propertyId: null,
      role: PropertyRole.SUPER_ADMIN,
      isActive: true,
    });
    await this.memberships.save(membership);

    return {
      id: saved.id,
      name: saved.name,
      email: saved.email,
      status: saved.status,
      globalRole: GlobalRole.SUPER_ADMIN,
    };
  }

  async login(dto: LoginDto) {
    const email = dto.email?.toLowerCase();
    if (!email || !dto.password) {
      throw new BadRequestException('Email and password are required');
    }

    const user = await this.users.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('User is inactive');
    }

    const isMatch = await argon2.verify(user.passwordHash, dto.password);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const memberships = await this.memberships.find({
      where: { userId: user.id, isActive: true },
    });

    const isSuperAdmin = memberships.some(
      (membership) => membership.role === PropertyRole.SUPER_ADMIN,
    );
    const roles = memberships
      .filter(
        (membership) =>
          membership.propertyId !== null &&
          membership.propertyId !== undefined &&
          membership.role !== PropertyRole.SUPER_ADMIN,
      )
      .map((membership) => ({
        propertyId: membership.propertyId!,
        role: membership.role,
      }));

    const payload: JwtPayload = {
      sub: String(user.id),
      email: user.email,
      globalRole: isSuperAdmin ? GlobalRole.SUPER_ADMIN : GlobalRole.NONE,
      roles,
    };

    const secret: Secret = this.getJwtSecret();
    const options: SignOptions = {
      expiresIn: this.getJwtExpiresIn() as SignOptions['expiresIn'],
    };
    const accessToken = sign(payload, secret, options);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        globalRole: payload.globalRole,
        roles: payload.roles,
      },
    };
  }

  async me(payload: JwtPayload) {
    const user = await this.users.findOne({
      where: { id: Number(payload.sub) },
    });
    if (!user) {
      throw new UnauthorizedException('Unauthorized');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      globalRole: payload.globalRole,
      roles: payload.roles,
    };
  }
}

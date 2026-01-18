import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { GlobalRole } from '../enums/global-role.enum';
import { PropertyRole } from '../enums/property-role.enum';
import type { JwtPayload } from '../types/auth.types';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const isGlobalRole = (value: unknown): value is GlobalRole =>
  value === GlobalRole.SUPER_ADMIN || value === GlobalRole.NONE;

const isPropertyRole = (value: unknown): value is PropertyRole =>
  value === PropertyRole.SUPER_ADMIN ||
  value === PropertyRole.PROPERTY_ADMIN ||
  value === PropertyRole.STAFF;

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader: string | undefined = request.headers?.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Unauthorized');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
      if (
        !decoded?.sub ||
        !decoded?.email ||
        !decoded?.globalRole ||
        !Array.isArray(decoded?.roles) ||
        !isGlobalRole(decoded.globalRole)
      ) {
        throw new UnauthorizedException('Unauthorized');
      }

      for (const role of decoded.roles) {
        if (
          !role ||
          typeof role.propertyId !== 'number' ||
          !Number.isInteger(role.propertyId) ||
          !isPropertyRole(role.role)
        ) {
          throw new UnauthorizedException('Unauthorized');
        }
      }

      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }
}

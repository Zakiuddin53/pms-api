import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { PropertyRole } from '@/common/enums/role.enum';
import type { JwtPayload } from '@/common/types/auth.types';

const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
};

const isPropertyRole = (value: unknown): value is PropertyRole =>
  value === PropertyRole.SUPER_ADMIN || value === PropertyRole.PROPERTY_ADMIN;

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
        !isPropertyRole(decoded.role) ||
        !Array.isArray(decoded.permissions) ||
        !Array.isArray(decoded.roles)
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

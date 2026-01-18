import { Request, Response, NextFunction } from 'express';
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

const isGlobalRole = (role: unknown): role is GlobalRole =>
  role === GlobalRole.SUPER_ADMIN || role === GlobalRole.NONE;

const isPropertyRole = (role: unknown): role is PropertyRole =>
  role === PropertyRole.SUPER_ADMIN ||
  role === PropertyRole.PROPERTY_ADMIN ||
  role === PropertyRole.STAFF;

export const authenticateJWT = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const token = authHeader.slice('Bearer '.length).trim();
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
    if (!decoded?.sub || !decoded?.email || !decoded?.globalRole) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!isGlobalRole(decoded.globalRole) || !Array.isArray(decoded.roles)) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    for (const role of decoded.roles) {
      if (
        !role ||
        typeof role.propertyId !== 'number' ||
        !Number.isInteger(role.propertyId) ||
        !isPropertyRole(role.role)
      ) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
    }

    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

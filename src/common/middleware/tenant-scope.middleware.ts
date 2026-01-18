import { Request, Response, NextFunction } from 'express';
import { GlobalRole } from '../enums/global-role.enum';

export const tenantScope = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const role = req.user?.globalRole;
  if (role === GlobalRole.SUPER_ADMIN) {
    const headerValue = req.headers['x-property-id'];
    if (headerValue === undefined) {
      if (req.baseUrl?.startsWith('/super-admin')) {
        return next();
      }
      if (req.baseUrl === '/auth' && req.path === '/me') {
        return next();
      }
      return res.status(403).json({ message: 'Forbidden' });
    }
    const parsed = Number(
      Array.isArray(headerValue) ? headerValue[0] : headerValue,
    );
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    req.propertyId = parsed;
    return next();
  }

  const propertyId = req.user?.roles?.[0]?.propertyId;
  if (!Number.isInteger(propertyId)) {
    return res.status(403).json({ message: 'Forbidden' });
  }

  req.propertyId = propertyId;
  return next();
};

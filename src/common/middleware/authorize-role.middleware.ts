import { Request, Response, NextFunction } from 'express';
import { GlobalRole } from '../enums/global-role.enum';
import { PropertyRole } from '../enums/property-role.enum';

export const authorizeRole =
  (allowedRoles: PropertyRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (req.user.globalRole === GlobalRole.SUPER_ADMIN) {
      return next();
    }

    const hasRole = req.user.roles?.some((role) => allowedRoles.includes(role.role));
    if (!hasRole) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return next();
  };

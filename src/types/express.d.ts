import type { PropertyRole } from '../common/enums/property-role.enum';
import type { JwtPayload } from '../common/types/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      propertyId?: number;
      propertyRole?: PropertyRole;
    }
  }
}

export {};

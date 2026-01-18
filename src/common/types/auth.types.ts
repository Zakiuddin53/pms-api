import { GlobalRole } from '../enums/global-role.enum';
import { PropertyRole } from '../enums/property-role.enum';

export type JwtPropertyRole = {
  propertyId: number;
  role: PropertyRole;
};

export type JwtPayload = {
  sub: string;
  email: string;
  globalRole: GlobalRole;
  roles: JwtPropertyRole[];
};

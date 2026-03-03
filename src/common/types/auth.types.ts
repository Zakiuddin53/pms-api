import { GlobalRole } from '@/common/enums/role.enum';
import { PropertyRole } from '@/common/enums/role.enum';

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

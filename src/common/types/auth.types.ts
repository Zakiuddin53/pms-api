import { PropertyRole } from '@/common/enums/role.enum';
import type { Permission } from '@/common/permissions/permissions';

export type JwtPropertyRole = {
  propertyId: number;
  role: PropertyRole;
};

export type JwtPayload = {
  sub: string;
  email: string;
  /** Top-level role for the user: SUPER_ADMIN or PROPERTY_ADMIN */
  role: PropertyRole;
  /**
   * Custom permission set embedded at login time.
   * Empty for SUPER_ADMIN (all permissions resolved at check-time).
   * Explicit list for PROPERTY_ADMIN.
   */
  permissions: Permission[];
  roles: JwtPropertyRole[];
};

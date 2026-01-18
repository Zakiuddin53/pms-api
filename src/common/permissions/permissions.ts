import { PropertyRole } from '../enums/property-role.enum';

export const Permissions = {
  PROPERTIES_CREATE: 'properties:create',
  PROPERTIES_LIST: 'properties:list',
  PROPERTY_ADMINS_CREATE: 'properties:admins:create',
  PROPERTY_STAFF_CREATE: 'properties:staff:create',
  PROPERTY_USERS_READ: 'properties:users:read',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const RolePermissions: Record<PropertyRole, Permission[]> = {
  [PropertyRole.SUPER_ADMIN]: [
    Permissions.PROPERTIES_CREATE,
    Permissions.PROPERTIES_LIST,
    Permissions.PROPERTY_ADMINS_CREATE,
    Permissions.PROPERTY_STAFF_CREATE,
    Permissions.PROPERTY_USERS_READ,
  ],
  [PropertyRole.PROPERTY_ADMIN]: [
    Permissions.PROPERTY_STAFF_CREATE,
    Permissions.PROPERTY_USERS_READ,
  ],
  [PropertyRole.STAFF]: [],
};

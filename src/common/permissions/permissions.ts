import { PropertyRole } from '@/common/enums/role.enum';

export const Permissions = {
  PROPERTIES_CREATE: 'properties:create',
  PROPERTIES_LIST: 'properties:list',
  PROPERTIES_UPDATE: 'properties:update',
  PROPERTY_USERS_READ: 'properties:users:read',
  PROPERTY_USERS_UPDATE: 'properties:users:update',
  ROOM_TYPES_CREATE: 'room-types:create',
  ROOM_TYPES_READ: 'room-types:read',
  ROOM_TYPES_UPDATE: 'room-types:update',
  ROOM_TYPES_DELETE: 'room-types:delete',
  ROOMS_CREATE: 'rooms:create',
  ROOMS_READ: 'rooms:read',
  ROOMS_UPDATE: 'rooms:update',
  ROOMS_DELETE: 'rooms:delete',
  ROOM_BLOCKS_CREATE: 'room-blocks:create',
  ROOM_BLOCKS_READ: 'room-blocks:read',
  ROOM_BLOCKS_UPDATE: 'room-blocks:update',
  ROOM_BLOCKS_DELETE: 'room-blocks:delete',
  RATES_CREATE: 'rates:create',
  RATES_READ: 'rates:read',
  RATES_UPDATE: 'rates:update',
  RATES_DELETE: 'rates:delete',
  AVAILABILITY_READ: 'availability:read',
  BOOKINGS_HOLD: 'bookings:hold',
  BOOKINGS_CONFIRM: 'bookings:confirm',
  BOOKINGS_READ: 'bookings:read',
  BOOKINGS_CANCEL: 'bookings:cancel',
  BOOKINGS_CHECKIN: 'bookings:checkin',
  BOOKINGS_CHECKOUT: 'bookings:checkout',
  PAYMENTS_READ: 'payments:read',
  PAYMENTS_CREATE: 'payments:create',
  PAYMENTS_REFUND: 'payments:refund',
  LEADS_READ: 'leads:read',
  BOOKINGS_CREATE: 'bookings:create',
  BOOKINGS_UPDATE: 'bookings:update',
  STAY_EARLY_CHECKOUT: 'stays:early-checkout',
  STAY_ROOM_CHANGE: 'stays:room-change',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];
export const ALL_PERMISSIONS: Permission[] = Object.values(Permissions);

/**
 * Resolves the effective permissions for a user based on their role.
 *
 * - SUPER_ADMIN   → ALL_PERMISSIONS (stored `customPermissions` is ignored)
 * - PROPERTY_ADMIN → uses the custom permission set stored on `User.permissions`
 *                    (empty array = no access until Super Admin grants something)
 */
export function resolvePermissions(
  role: PropertyRole,
  customPermissions: Permission[] | null,
): Permission[] {
  if (role === PropertyRole.SUPER_ADMIN) {
    return ALL_PERMISSIONS;
  }
  return customPermissions ?? [];
}

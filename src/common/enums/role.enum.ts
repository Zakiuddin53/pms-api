export enum PropertyRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PROPERTY_ADMIN = 'PROPERTY_ADMIN',
  PROPERTY_STAFF = 'PROPERTY_STAFF',
}

/**
 * UserRole is a simple discriminator on the User row.
 * - STAFF  → can log in, has a PropertyRole that controls what they can do
 * - GUEST  → a booking customer; no login, no PropertyRole needed
 */
export enum UserRole {
  STAFF = 'STAFF',
  GUEST = 'GUEST',
}

export enum UserIdType {
  AADHAR = 'AADHAR',
  PASSPORT = 'PASSPORT',
  DRIVING_LICENSE = 'DRIVING_LICENSE',
}

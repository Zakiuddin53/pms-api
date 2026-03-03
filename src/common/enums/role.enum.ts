export enum GlobalRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PROPERTY_ADMIN = 'PROPERTY_ADMIN',
  NONE = 'NONE',
}

export enum PropertyRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  PROPERTY_ADMIN = 'PROPERTY_ADMIN',
  PROPERTY_STAFF = 'PROPERTY_STAFF', // renamed from STAFF — avoids confusion with UserRole.STAFF
}

/**
 * UserRole is a simple discriminator on the User row.
 * It answers ONE question: "Is this a guest customer or a staff-level human?"
 *
 * - STAFF  → can log in, has PropertyRole memberships that control what they can do
 * - GUEST  → a booking customer; no login, no PropertyRole memberships needed
 *
 * All fine-grained access control lives in PropertyRole + UserPropertyRole.
 */
export enum UserRole {
  STAFF = 'STAFF',
  GUEST = 'GUEST',
}
/**
 * Role Constants
 *
 * Centralized role hierarchy and role group definitions.
 * These constants are used across the application for role-based access control,
 * navigation, and redirect logic.
 *
 * Role Hierarchy (Highest to Lowest Priority):
 * 1. Developer - Full platform access
 * 2. Admin - High-level administrative functions
 * 3. Manager - Operational oversight
 * 4. Location Admin - Location-specific management
 * 5. Vault Manager - Vault management operations
 * 6. Cashier - Cashier operations
 * 7. Technician - Technical operations
 * 8. Collector - Collection operations
 */
export type UserRole =
  | 'developer'
  | 'admin'
  | 'manager'
  | 'location admin'
  | 'vault-manager'
  | 'cashier'
  | 'technician'
  | 'collector';

/**
 * Role priority order (highest to lowest)
 * Used for determining primary role when user has multiple roles
 */
export const ROLE_PRIORITY: UserRole[] = [
  'developer',
  'admin',
  'manager',
  'location admin',
  'vault-manager',
  'cashier',
  'technician',
  'collector',
];

/**
 * High priority roles for redirect logic
 * Users with these roles are redirected to dashboard on login
 */
export const HIGH_PRIORITY_ROLES: UserRole[] = [
  'admin',
  'developer',
  'manager',
  'location admin',
];

/**
 * CMS access roles (can access CMS interface)
 * These roles can see CMS sidebar and access CMS pages
 */
export const CMS_ACCESS_ROLES: UserRole[] = [
  'developer',
  'admin',
  'manager',
  'location admin',
];

/**
 * User Display Utilities
 *
 * Utility functions for deriving human-friendly display values for users.
 *
 * Features:
 * - User display name derivation
 * - Priority order: firstName + lastName -> username -> emailAddress
 */

import type { UserAuthPayload } from '@/shared/types/auth';

// ============================================================================
// Display Name Functions
// ============================================================================
/**
 * Gets the display name for a user based on their profile information.
 * Priority: firstName + lastName -> username -> emailAddress.
 *
 * @param user - The user object.
 * @returns The display name for the user.
 */
export function getUserDisplayName(user: UserAuthPayload | null): string {
  if (!user) return 'Unknown User';

  // Try firstName + lastName first
  const firstName = user.profile?.firstName?.trim();
  const lastName = user.profile?.lastName?.trim();

  if (firstName && lastName) {
    return `${firstName} ${lastName}`;
  }

  if (firstName) {
    return firstName;
  }

  if (lastName) {
    return lastName;
  }

  // Fallback to username
  if (user.username?.trim()) {
    return user.username.trim();
  }

  // Final fallback to email
  if (user.emailAddress?.trim()) {
    return user.emailAddress.trim();
  }

  return 'Unknown User';
}

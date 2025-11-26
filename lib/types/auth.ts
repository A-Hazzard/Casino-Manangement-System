/**
 * Auth Types
 * Frontend authentication types for useAuth hook return values.
 *
 * Defines the authentication state including user data, loading state,
 * and authentication status.
 */
import type { UserAuthPayload } from '@/shared/types/auth';

export type UseAuthReturn = {
  user: UserAuthPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};

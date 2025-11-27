/**
 * User Types (Frontend)
 * Frontend-specific user types for current user data and hooks.
 *
 * Used by useCurrentUser hook to manage current user state,
 * changes tracking, and user data refresh functionality.
 */
export type CurrentUserData = {
  id: string;
  username: string;
  emailAddress: string;
  profile: Record<string, unknown>;
  roles: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UseCurrentUserReturn = {
  currentUser: CurrentUserData | null;
  isLoading: boolean;
  error: string | null;
  refreshUser: () => Promise<void>;
  hasChanges: boolean;
};

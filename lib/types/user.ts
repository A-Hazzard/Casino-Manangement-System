export type CurrentUserData = {
  id: string;
  username: string;
  emailAddress: string;
  profile: Record<string, unknown>;
  roles: string[];
  enabled: boolean;
  resourcePermissions: Record<string, unknown>;
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

/**
 * Users Types (API)
 * API-specific user types for user documents and authentication.
 *
 * Includes types for:
 * - Current user (authenticated user data)
 * - User documents with profile, roles, and permissions
 * - User documents with password for authentication
 * - Original user type with extended profile information
 * Used by API routes and backend user management.
 */
export type CurrentUser = {
  _id: string;
  emailAddress: string;
  roles: string[];
};

export type UserDocument = {
  _id: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    gender?: string;
  };
  username: string;
  emailAddress: string;
  isEnabled: boolean;
  roles: string[];
  profilePicture?: string | null;
  sessionVersion?: number;
  loginCount?: number;
  lastLoginAt?: Date | string | null;
};

export type UserDocumentWithPassword = UserDocument & {
  password?: string;
  permissions?: string[];
  resourcePermissions?: {
    [key: string]: {
      entity: string;
      resources: string[];
    };
  };
  sessionVersion?: number;
  toObject: (_options?: Record<string, unknown>) => {
    _id: string;
    emailAddress: string;
    isEnabled: boolean;
    roles: string[];
    permissions?: string[];
    resourcePermissions?: {
      [key: string]: {
        entity: string;
        resources: string[];
      };
    };
    sessionVersion?: number;
    loginCount?: number;
    lastLoginAt?: Date | string | null;
    [key: string]: unknown;
  };
};

export type OriginalUserType = {
  _id: string;
  username: string;
  emailAddress: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    address?: {
      street?: string;
      town?: string;
      region?: string;
      country?: string;
      postalCode?: string;
    };
    identification?: {
      dateOfBirth?: string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
  };
};

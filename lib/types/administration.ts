import type { ActivityLogData } from '@/lib/types/hooks';
import type { Licensee } from '@/lib/types/licensee';

export type User = {
  _id: string;
  name: string;
  username: string;
  email?: string;
  emailAddress?: string;
  enabled: boolean;
  roles: string[];
  profilePicture: string | null;
  rel?: {
    licencee?: string[];
  };
  assignedLocations?: string[]; // Array of location IDs user has access to
  assignedLicensees?: string[]; // Array of licensee IDs user has access to
  password?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    phoneNumber?: string;
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
  // Session and login tracking
  loginCount?: number;
  lastLoginAt?: Date | string;
  sessionVersion?: number;
};

export type SortKey = keyof User | null;

export type DeleteUserModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onDelete: () => void;
};

export type UserDetailsModalProps = {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onSave: (
    data: Partial<User> & {
      password?: string;
    }
  ) => void;
};

// Hook types for useAdministrationData
export type UseAdministrationDataProps = {
  selectedLicencee: string;
  activeSection: string;
};

export type UseAdministrationDataReturn = {
  // Data states
  users: User[];
  licensees: Licensee[];
  activityLogs: ActivityLogData[];

  // Loading states
  loadingUsers: boolean;
  loadingLicensees: boolean;
  loadingActivityLogs: boolean;

  // Error states
  error: string | null;

  // Actions
  refreshUsers: () => Promise<void>;
  refreshLicensees: () => Promise<void>;
  refreshActivityLogs: () => Promise<void>;
  refreshAllData: () => Promise<void>;
};

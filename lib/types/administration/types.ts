export type User = {
  _id: string;
  name: string;
  username: string;
  email?: string;
  emailAddress?: string;
  isEnabled: boolean;
  roles: string[];
  profilePicture: string | null;
  assignedLocations?: string[]; // Array of location IDs user has access to
  assignedLicencees?: string[]; // Array of licencee IDs user has access to
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
  multiplier?: number | null;
};

export type SortKey = keyof User | null;


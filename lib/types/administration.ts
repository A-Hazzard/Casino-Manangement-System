export type GamingLocationsResource = {
  entity: "gaming-locations";
  resources: string[];
};

export type ResourcePermissions = {
  "gaming-locations"?: GamingLocationsResource;
  // Add other resource types as needed
};

export type User = {
  _id: string;
  name: string;
  username: string;
  email: string;
  enabled: boolean;
  roles: string[];
  profilePicture: string | null;
  resourcePermissions?: ResourcePermissions;
  password?: string;
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
  onSave: (data: {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    otherName?: string;
    gender?: string;
    street?: string;
    town?: string;
    region?: string;
    country?: string;
    postalCode?: string;
    dateOfBirth?: string;
    idType?: string;
    idNumber?: string;
    notes?: string;
  }) => void;
};

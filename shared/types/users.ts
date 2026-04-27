export type CurrentUser = {
  _id: string;
  emailAddress: string;
  roles?: string[];
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
  profilePicture?: string;
  multiplier?: number;
  isEnabled?: boolean;
  roles?: string[];
};

export type ProfileUpdatePayload = {
  username: string;
  firstName: string;
  lastName: string;
  otherName?: string;
  gender?: string;
  emailAddress: string;
  phone: string;
  dateOfBirth?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  licenceeIds?: string[];
  locationIds?: string[];
};


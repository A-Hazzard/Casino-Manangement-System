// API-specific user types
export type CurrentUser = {
  _id: string;
  emailAddress: string;
  roles?: string[];
};

import type { UserDocument } from './auth';

export type UserDocumentWithPassword = UserDocument & {
  updateOne: (update: Record<string, unknown>) => Promise<unknown>;
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

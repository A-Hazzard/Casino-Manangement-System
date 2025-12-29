import { GamingMachine } from '@/shared/types/entities';

// Location page types
export type ExtendedCabinetDetail = GamingMachine & {
  serialNumber: string;
  isOnline?: boolean;
  lastCommunication?: string | Date;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  net?: number;
  lastActivity?: string | Date;
};

// Administration page types
export type AddUserForm = {
  username?: string;
  email?: string;
  password?: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  gender?: string;
  phoneNumber?: string;
  profilePicture?: string | null;
  allowedLocations: string[];
  licenseeIds?: string[];
  street?: string;
  town?: string;
  region?: string;
  country?: string;
  postalCode?: string;
  dateOfBirth?: string;
  idType?: string;
  idNumber?: string;
  notes?: string;
};

export type AddLicenseeForm = {
  _id?: string;
  name?: string;
  description?: string | undefined;
  country?: string;
  startDate?: Date | string | undefined;
  expiryDate?: Date | string | undefined;
  prevStartDate?: Date | string | undefined;
  prevExpiryDate?: Date | string | undefined;
};

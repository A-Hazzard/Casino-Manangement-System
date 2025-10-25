import { GamingMachine } from '@/shared/types/entities';
import type { ResourcePermissions } from './administration';

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

export type LocationInfo = {
  _id: string;
  name: string;
  address?: string;
  licencee?: string;
  contactName?: string;
  moneyIn?: number;
  moneyOut?: number;
  gross?: number;
  net?: number;
};

// Collection Report page types
export type CollectionReportSkeletonProps = {
  pathname: string;
};

export type TabButtonProps = {
  label: string;
  isActive: boolean;
  onClick: () => void;
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
  profilePicture?: string | null;
  resourcePermissions?: ResourcePermissions;
  allowedLocations: string[];
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

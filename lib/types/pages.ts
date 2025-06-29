import type { CabinetDetail } from "./cabinets";
import type { ResourcePermissions } from "./administration";

// Location page types
export type ExtendedCabinetDetail = CabinetDetail & {
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
  description?: string;
  country?: string;
  startDate?: Date | string;
  expiryDate?: Date | string;
  prevStartDate?: Date | string;
  prevExpiryDate?: Date | string;
};

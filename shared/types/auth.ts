import { Document } from 'mongoose';

export type InvalidProfileFields = {
  username?: boolean;
  firstName?: boolean;
  lastName?: boolean;
  otherName?: boolean;
  gender?: boolean;
  emailAddress?: boolean;
  phone?: boolean;
  dateOfBirth?: boolean;
  password?: boolean;
};

export type ProfileValidationReasons = {
  username?: string;
  firstName?: string;
  lastName?: string;
  otherName?: string;
  gender?: string;
  emailAddress?: string;
  phone?: string;
  dateOfBirth?: string;
  password?: string;
};

export type UserDocument = Document & {
  _id: string;
  isEnabled: boolean;
  roles: string[];
  username: string;
  emailAddress: string;
  assignedLocations?: string[];
  assignedLicensees?: string[];
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
      dateOfBirth?: Date | string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
    phoneNumber?: string;
    notes?: string;
  };
  profilePicture?: string;
  password: string;
  passwordUpdatedAt?: Date;
  sessionVersion?: number;
  loginCount?: number;
  lastLoginAt?: Date;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type LeanUserDocument = Omit<UserDocument, keyof Document> & {
  _id: string;
  __v?: number;
};

export type UserAuthPayload = {
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  roles?: string[];
  assignedLocations?: string[];
  assignedLicensees?: string[];
  profile?: {
    firstName?: string;
    lastName?: string;
    otherName?: string;
    gender?: string;
    identification?: {
      dateOfBirth?: string;
      idType?: string;
      idNumber?: string;
      notes?: string;
    };
    phoneNumber?: string;
    contact?: {
      phone?: string;
      mobile?: string;
      email?: string;
    };
  };
  // Enhanced security fields
  lastLoginAt?: Date;
  loginCount?: number;
  isLocked?: boolean;
  lockedUntil?: Date;
  failedLoginAttempts?: number;
  // Validation flags
  requiresPasswordUpdate?: boolean;
  requiresProfileUpdate?: boolean;
  invalidProfileFields?: InvalidProfileFields;
  invalidProfileReasons?: ProfileValidationReasons;
};

export type AuthResult = {
  success: boolean;
  message?: string;
  token?: string;
  refreshToken?: string;
  user?: UserAuthPayload;
  expiresAt?: string;
  requiresPasswordUpdate?: boolean;
  requiresProfileUpdate?: boolean;
  invalidProfileFields?: InvalidProfileFields;
  invalidProfileReasons?: ProfileValidationReasons;
};

export type JwtPayload = {
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  roles?: string[];
  assignedLocations?: string[];
  assignedLicensees?: string[];
  // Enhanced security
  sessionId: string;
  sessionVersion?: number;
  dbContext: {
    connectionString: string;
    timestamp: number;
  };
  iat?: number;
  exp?: number;
  jti?: string; // JWT ID for tracking
};

export type RefreshTokenPayload = {
  userId: string;
  sessionId: string;
  type: 'refresh';
  iat?: number;
  exp?: number;
};

export type LoginFormProps = {
  identifier: string;
  setIdentifier: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  rememberMe: boolean;
  setRememberMe: (value: boolean) => void;
  errors: { [key: string]: string };
  message?: string;
  messageType?: 'success' | 'error' | 'info';
  loading: boolean;
  redirecting: boolean;
  handleLogin: (e: React.FormEvent) => void;
};

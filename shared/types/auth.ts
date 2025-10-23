import { Document } from "mongoose";

export type UserDocument = Document & {
  _id: string;
  emailAddress: string;
  username: string;
  password: string;
  isEnabled: boolean;
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
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type UserAuthPayload = {
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  roles?: string[];
  resourcePermissions?: {
    "gaming-locations"?: {
      entity: string;
      resources: string[];
    };
  };
  profile?: {
    firstName?: string;
    lastName?: string;
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
  invalidProfileFields?: {
    username?: boolean;
    firstName?: boolean;
    lastName?: boolean;
  };
};

export type LoginRequestBody = {
  identifier: string; // email or username
  password: string;
  rememberMe?: boolean;
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
  invalidProfileFields?: {
    username?: boolean;
    firstName?: boolean;
    lastName?: boolean;
  };
};

export type JwtPayload = {
  _id: string;
  emailAddress: string;
  username: string;
  isEnabled: boolean;
  // Enhanced security
  sessionId: string;
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
  type: "refresh";
  iat?: number;
  exp?: number;
};

export type SessionData = {
  userId: string;
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastAccessedAt: Date;
  expiresAt: Date;
  isActive: boolean;
};

export type AuthContext = {
  user: UserAuthPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginRequestBody) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
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
  messageType?: "success" | "error" | "info";
  loading: boolean;
  redirecting: boolean;
  handleLogin: (e: React.FormEvent) => void;
};

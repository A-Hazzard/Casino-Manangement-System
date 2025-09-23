import { Document } from "mongoose";

export type UserDocument = Document & {
  _id: string;
  emailAddress: string;
  username: string;
  password: string;
  isEnabled: boolean;
  roles: string[];
  permissions: string[];
  resourcePermissions: Record<
    string,
    {
      entity: string;
      resources: string[];
    }
  >;
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
  roles: string[];
  permissions: string[];
  resourcePermissions: Record<
    string,
    {
      entity: string;
      resources: string[];
    }
  >;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
};

export type LoginRequestBody = {
  identifier: string; // email or username
  password: string;
};

export type AuthResult = {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserAuthPayload;
};

export type LoginFormProps = {
  identifier: string;
  setIdentifier: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: (value: boolean) => void;
  errors: { [key: string]: string };
  message?: string;
  messageType?: "success" | "error" | "info";
  loading: boolean;
  redirecting: boolean;
  handleLogin: (e: React.FormEvent) => void;
};

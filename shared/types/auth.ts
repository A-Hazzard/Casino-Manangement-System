import { Document } from "mongoose";
import type { UserAuthPayload } from "@/lib/types";

export type UserDocument = Document & {
  _id: string;
  emailAddress: string;
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
  handleLogin: () => void;
};

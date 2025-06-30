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
  emailAddress: string;
  password: string;
};

export type AuthResult = {
  success: boolean;
  message?: string;
  token?: string;
  user?: UserAuthPayload;
};

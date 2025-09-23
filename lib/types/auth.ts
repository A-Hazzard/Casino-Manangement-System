
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

import { Document } from "mongoose";

export type UserDocument = Document & {
    _id: string;
    emailAddress: string;
    password: string;
    isEnabled: boolean;
    roles: string[];
    permissions: string[];
    resourcePermissions: Record<string, {
        entity: string;
        resources: string[];
    }>;
};

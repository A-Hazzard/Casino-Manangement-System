import User from "../models/user";
import { User as UserType } from "../types/auth";

export async function getUserByEmail(emailAddress: string): Promise<UserType | null> {
    return User.findOne({ emailAddress: { $regex: new RegExp(`^${emailAddress}$`, "i") } });
}

import User from "../models/user";
import {UserDocument} from "@/app/api/lib/types/auth";

export async function getUserByEmail(emailAddress: string): Promise<UserDocument | null> {
    return User.findOne({ emailAddress: { $regex: new RegExp(`^${emailAddress}$`, "i") } });
}

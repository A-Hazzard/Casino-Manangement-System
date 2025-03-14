import {UserDocument} from "@/app/api/lib/types/auth";

export function validateEmail(emailAddress: UserDocument["emailAddress"]): boolean {
    return /\S+@\S+\.\S+/.test(emailAddress)
}

export function validatePassword(password: UserDocument["password"]): boolean {
    return password.length >= 6
}
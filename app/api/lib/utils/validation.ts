import {User} from "@/app/api/lib/types/auth";

export function validateEmail(emailAddress: User["emailAddress"]): boolean {
    return /\S+@\S+\.\S+/.test(emailAddress)
}

export function validatePassword(password: User["password"]): boolean {
    return password.length >= 6
}
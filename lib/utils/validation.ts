export function validateEmail(email: string): boolean {
    return /\S+@\S+\.\S+/.test(email)
}

export function validatePassword(password: string): boolean {
    return password.length >= 6
}

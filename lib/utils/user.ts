import { cookies } from "next/headers";
import {JWTPayload, jwtVerify} from "jose";

export async function getUserFromServer(): Promise<JWTPayload | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    if (!token) return null;
    try {
        const { payload } = await jwtVerify(
            token,
            new TextEncoder().encode(process.env.JWT_SECRET || "")
        );
        return payload as JWTPayload;
    } catch (error) {
        console.error("JWT verification failed:", error);
        return null;
    }
}


export async function getUserIdFromServer(): Promise<string | null> {
    const user: JWTPayload | null = await getUserFromServer();
    return user ? (user.userId as string) : null;
}
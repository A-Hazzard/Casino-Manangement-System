import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "";
const publicPaths = ["/login", "/forgot-password"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Exclude API routes from middleware authentication
    if (pathname.startsWith("/api")) {
        return NextResponse.next();
    }

    const token = request.cookies.get("token")?.value;
    let isAuthenticated = false;

    if (token) {
        try {
            await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
            isAuthenticated = true;
        } catch (err) {
            console.log("JWT verification failed:", err);
        }
    }

    const isPublicPath = publicPaths.includes(pathname);

    if (isAuthenticated && isPublicPath) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isAuthenticated && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
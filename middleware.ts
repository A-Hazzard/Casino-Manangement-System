import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "";
const publicPaths = ["/login", "/forgot-password"];

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // ✅ Skip API requests & public assets
    if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.startsWith("/favicon.ico")) {
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

    // ✅ Redirect logged-in users away from `/login`
    if (isAuthenticated && isPublicPath) {
        return NextResponse.redirect(new URL("/", request.url));
    }

    // ✅ Redirect unauthenticated users away from protected pages
    if (!isAuthenticated && !isPublicPath) {
        return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};

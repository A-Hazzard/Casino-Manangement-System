import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "development-secret";
const publicPaths = ["/login", "/forgot-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ✅ Skip API requests & public assets
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.match(
      /\.(png|jpg|jpeg|gif|svg|ico|webp|bmp|tiff|pdf|txt|css|js|woff|woff2|ttf|eot)$/i
    )
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("token")?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      // Make sure JWT_SECRET is not empty
      if (!JWT_SECRET) {
        console.error(
          "JWT_SECRET is empty. Please set it in your environment variables."
        );
        return NextResponse.redirect(
          new URL("/login?error=server_config", request.url)
        );
      }

      await jwtVerify(token, new TextEncoder().encode(JWT_SECRET));
      isAuthenticated = true;
    } catch (err) {
      console.error("JWT verification failed:", err);
      // Clear the invalid token by setting the response with an expired cookie
      const response = NextResponse.redirect(
        new URL("/login?error=invalid_token", request.url)
      );
      response.cookies.set("token", "", {
        expires: new Date(0),
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax", // Consistent with login cookie settings
        path: "/",
      });
      return response;
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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.|api/).*)"],
};

import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/utils/auth";

const publicPaths = ["/login", "/forgot-password", "/reset-password"];

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

  // Debug logging for infinite loop investigation
  if (process.env.NODE_ENV === "development") {
    console.log(`[MIDDLEWARE] Processing: ${pathname}`);
  }

  const token = request.cookies.get("token")?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const payload = await verifyAccessToken(token);

      if (payload) {
        // Database context validation - disabled since contexts match
        // The database contexts are identical, so no validation needed
        // TODO: Remove this section entirely once confirmed stable

        // Check if user is enabled
        if (!payload.isEnabled) {
          console.warn("User account is disabled");
          return createLogoutResponse(request, "account_disabled");
        }

        isAuthenticated = true;

        if (process.env.NODE_ENV === "development") {
          console.log(
            `[MIDDLEWARE] User authenticated: ${payload.emailAddress}`
          );
        }
      }
    } catch (err) {
      console.error("JWT verification failed:", err);
      return createLogoutResponse(request, "invalid_token");
    }
  } else {
    if (process.env.NODE_ENV === "development") {
      console.log(`[MIDDLEWARE] No token found for ${pathname}`);
    }
  }

  const isPublicPath = publicPaths.includes(pathname);

  if (process.env.NODE_ENV === "development") {
    console.log(
      `[MIDDLEWARE] isAuthenticated: ${isAuthenticated}, isPublicPath: ${isPublicPath}, pathname: ${pathname}`
    );
  }

  // ✅ Redirect logged-in users away from public pages
  if (isAuthenticated && isPublicPath) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[MIDDLEWARE] Redirecting authenticated user from ${pathname} to /`
      );
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // ✅ Redirect unauthenticated users away from protected pages
  if (!isAuthenticated && !isPublicPath) {
    if (process.env.NODE_ENV === "development") {
      console.log(
        `[MIDDLEWARE] Redirecting unauthenticated user from ${pathname} to /login`
      );
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[MIDDLEWARE] Allowing access to ${pathname}`);
  }

  return NextResponse.next();
}

/**
 * Creates a logout response with cleared cookies
 */
function createLogoutResponse(
  request: NextRequest,
  error: string
): NextResponse {
  const response = NextResponse.redirect(
    new URL(`/login?error=${error}`, request.url)
  );

  response.cookies.set("token", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  response.cookies.set("refreshToken", "", {
    expires: new Date(0),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.|api/).*)"],
};

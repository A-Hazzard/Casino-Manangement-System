import { SignJWT, jwtVerify } from "jose";
import type {
  JwtPayload,
  RefreshTokenPayload,
  SessionData,
} from "@/shared/types/auth";

// Environment configuration
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not defined in environment variables.");
  }
  return secret;
}

export function getRefreshTokenSecret(): string {
  const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "REFRESH_TOKEN_SECRET or JWT_SECRET is not defined in environment variables."
    );
  }
  return secret;
}

export function getCurrentDbConnectionString(): string {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    throw new Error(
      "MONGODB_URI or MONGO_URI is not defined in environment variables."
    );
  }
  return mongoUri;
}

// Token generation and verification
export async function generateAccessToken(
  payload: Omit<JwtPayload, "iat" | "exp" | "jti">
): Promise<string> {
  const secret = getJwtSecret();
  // Use sessionId from payload if provided, otherwise generate new one
  const sessionId = payload.sessionId || crypto.randomUUID();

  const tokenPayload: JwtPayload = {
    ...payload,
    sessionId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 120 * 60, // 120 minutes (2 hours)
    jti: crypto.randomUUID(),
  };

  return new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("120m")
    .sign(new TextEncoder().encode(secret));
}

export async function generateRefreshToken(
  userId: string,
  sessionId: string
): Promise<string> {
  const secret = getRefreshTokenSecret();

  const payload: RefreshTokenPayload = {
    userId,
    sessionId,
    type: "refresh",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(new TextEncoder().encode(secret));
}

export async function verifyAccessToken(
  token: string
): Promise<JwtPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as JwtPayload;
  } catch (error) {
    console.error("Access token verification failed:", error);
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const secret = getRefreshTokenSecret();
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as RefreshTokenPayload;
  } catch (error) {
    console.error("Refresh token verification failed:", error);
    return null;
  }
}

// Session management
export function createSessionData(
  userId: string,
  ipAddress: string,
  userAgent: string,
  rememberMe: boolean = false
): SessionData {
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() +
      (rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
  ); // 30 days or 1 day

  return {
    userId,
    sessionId,
    ipAddress,
    userAgent,
    createdAt: now,
    lastAccessedAt: now,
    expiresAt,
    isActive: true,
  };
}

export function isSessionValid(session: SessionData): boolean {
  const now = new Date();
  return session.isActive && session.expiresAt > now;
}

export function updateSessionAccess(session: SessionData): SessionData {
  return {
    ...session,
    lastAccessedAt: new Date(),
  };
}

// Security utilities
export function generateSecureToken(length: number = 32): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/\d/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Rate limiting utilities
export class RateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> =
    new Map();

  constructor(
    private maxAttempts: number = 5,
    private windowMs: number = 15 * 60 * 1000 // 15 minutes
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const attempt = this.attempts.get(identifier);

    if (!attempt) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (now > attempt.resetTime) {
      this.attempts.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (attempt.count >= this.maxAttempts) {
      return false;
    }

    attempt.count++;
    return true;
  }

  getRemainingAttempts(identifier: string): number {
    const attempt = this.attempts.get(identifier);
    if (!attempt) return this.maxAttempts;

    const now = Date.now();
    if (now > attempt.resetTime) return this.maxAttempts;

    return Math.max(0, this.maxAttempts - attempt.count);
  }

  getResetTime(identifier: string): number | null {
    const attempt = this.attempts.get(identifier);
    return attempt ? attempt.resetTime : null;
  }

  clearAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

// Global rate limiter instance
export const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes

/**
 * Returns a user-friendly error message for login/auth errors.
 */
export function getFriendlyErrorMessage(
  errorMsg: string,
  isUrlError: boolean = false
): string {
  if (!errorMsg) return "An unexpected error occurred. Please try again.";
  if (isUrlError) {
    switch (errorMsg) {
      case "server_config":
        return "Server configuration error. Please contact support.";
      case "invalid_token":
      case "token_expired":
        return "Your session has expired. Please log in again.";
      case "unauthorized":
        return "You are not authorized to access this resource.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }
  if (errorMsg.includes("401"))
    return "Your session has expired or you are not authorized. Please log in again.";
  if (errorMsg.includes("403"))
    return "You are not authorized to access this resource.";
  if (errorMsg.includes("500"))
    return "A server error occurred. Please try again later.";
  if (errorMsg.toLowerCase().includes("network"))
    return "Unable to connect. Please check your internet connection.";
  if (errorMsg.toLowerCase().includes("credential"))
    return "Invalid email or password. Please try again.";
  if (errorMsg.toLowerCase().includes("user not found"))
    return "No account found with this email address.";
  if (errorMsg.toLowerCase().includes("invalid"))
    return "Invalid email or password. Please try again.";
  return "An error occurred. Please try again.";
}

/**
 * Type guard to check if error has a message property.
 */
export function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

/**
 * Get authentication token from cookies (client-side)
 */
export function getAuthToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  const tokenCookie = cookies.find((cookie) =>
    cookie.trim().startsWith("token=")
  );

  if (tokenCookie) {
    return tokenCookie.split("=")[1];
  }

  return null;
}

/**
 * Create authenticated axios request config
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

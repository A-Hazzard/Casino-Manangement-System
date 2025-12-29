/**
 * Authentication Utilities
 *
 * JWT token generation, verification, and session management utilities.
 *
 * Features:
 * - JWT access token generation and verification
 * - Refresh token generation and verification
 * - Session data management
 * - Environment configuration helpers
 * - Token expiration handling
 */

import type { JwtPayload, RefreshTokenPayload } from '@/shared/types/auth';
import { SignJWT, jwtVerify } from 'jose';

// ============================================================================
// Environment Configuration
// ============================================================================
/**
 * Get JWT secret from environment variables
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables.');
  }
  return secret;
}

export function getCurrentDbConnectionString(): string {
  // Always read from process.env directly (no caching) to ensure we get the latest value
  const mongoUri = process.env.MONGODB_URI as string;

  // Only log warnings for missing URI, not every call (reduces log spam)
  if (!mongoUri) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[getCurrentDbConnectionString] MONGODB_URI is not defined in environment variables'
      );
    }
    throw new Error('MONGODB_URI is not defined in environment variables.');
  }
  return mongoUri;
}

// ============================================================================
// Token Generation
// ============================================================================
/**
 * Generate JWT access token
 */
export async function generateAccessToken(
  payload: Omit<JwtPayload, 'iat' | 'exp' | 'jti'>
): Promise<string> {
  const secret = getJwtSecret();
  // Use sessionId from payload if provided, otherwise generate new one
  const sessionId = payload.sessionId || crypto.randomUUID();

  const connectionString = getCurrentDbConnectionString();

  const tokenPayload: JwtPayload = {
    ...payload,
    sessionId,
    dbContext: {
      connectionString: connectionString,
      timestamp: Date.now(),
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
    jti: crypto.randomUUID(),
  };

  return new SignJWT(tokenPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));
}

/**
 * Generate refresh token
 */
export async function generateRefreshToken(
  userId: string,
  sessionId: string
): Promise<string> {
  const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      'REFRESH_TOKEN_SECRET or JWT_SECRET is not defined in environment variables.'
    );
  }

  const payload: RefreshTokenPayload = {
    userId,
    sessionId,
    type: 'refresh',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };

  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(new TextEncoder().encode(secret));
}

// ============================================================================
// Token Verification
// ============================================================================
/**
 * Verify access token
 */
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
    console.error('Access token verification failed:', error);
    return null;
  }
}

/**
 * Verify refresh token
 */
export async function verifyRefreshToken(
  token: string
): Promise<RefreshTokenPayload | null> {
  try {
    const secret = process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'REFRESH_TOKEN_SECRET or JWT_SECRET is not defined in environment variables.'
      );
    }
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret)
    );
    return payload as RefreshTokenPayload;
  } catch (error) {
    console.error('Refresh token verification failed:', error);
    return null;
  }
}

export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Returns a user-friendly error message for login/auth errors.
 */
export function getFriendlyErrorMessage(
  errorMsg: string,
  isUrlError: boolean = false
): string {
  if (!errorMsg) return 'An unexpected error occurred. Please try again.';
  if (isUrlError) {
    switch (errorMsg) {
      case 'server_config':
        return 'Server configuration error. Please contact support.';
      case 'invalid_token':
      case 'token_expired':
        return 'Your session has expired. Please log in again.';
      case 'database_context_mismatch':
        return 'Database context has changed. Please log in again.';
      case 'unauthorized':
        return 'You are not authorized to access this resource.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }
  if (errorMsg.includes('401'))
    return 'Your session has expired or you are not authorized. Please log in again.';
  if (errorMsg.includes('403'))
    return 'You are not authorized to access this resource.';
  if (errorMsg.includes('500'))
    return 'A server error occurred. Please try again later.';
  if (errorMsg.toLowerCase().includes('network'))
    return 'Unable to connect. Please check your internet connection.';
  if (errorMsg.toLowerCase().includes('credential'))
    return 'Invalid email or password. Please try again.';
  if (errorMsg.toLowerCase().includes('user not found'))
    return 'No account found with this email address.';
  if (errorMsg.toLowerCase().includes('invalid'))
    return 'Invalid email or password. Please try again.';
  return 'An error occurred. Please try again.';
}

/**
 * Create authenticated axios request config
 */
export function getAuthHeaders(): Record<string, string> {
  if (typeof document === 'undefined') return {};

  const cookies = document.cookie.split(';');
  const tokenCookie = cookies.find(cookie =>
    cookie.trim().startsWith('token=')
  );

  if (tokenCookie) {
    const token = tokenCookie.split('=')[1];
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  return {};
}

import type { NextRequest } from 'next/server';
import { decodeJwt } from 'jose';

interface LogContext {
  functionName: string;
  method: string;
  path: string;
  user?: {
    _id: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    emailAddress?: string;
  } | null;
  itemCount?: number;
  duration?: number;
  error?: Error | string;
}

const getLogTimestamp = (): string => {
  return new Date().toISOString();
};

const formatUserInfo = (user?: LogContext['user']): string => {
  if (!user) return 'Anonymous';
  const name =
    user.firstName && user.lastName
      ? `${user.firstName} ${user.lastName}`
      : user.username || user.emailAddress || 'Unknown';
  return `${name} (${user._id})`;
};

export const logRouteRequest = (
  functionName: string,
  method: string,
  path: string,
  user?: LogContext['user']
) => {
  console.log(
    `[${functionName}] ${getLogTimestamp()} | ${method} ${path} | User: ${formatUserInfo(user)}`
  );
};

export const logRouteFetch = (
  functionName: string,
  method: string,
  path: string,
  itemCount: number,
  user?: LogContext['user'],
  duration?: number
) => {
  const durationStr = duration ? ` | ${duration}ms` : '';
  console.log(
    `[${functionName}] ${getLogTimestamp()} | ${method} ${path} | Fetched: ${itemCount} items | User: ${formatUserInfo(user)}${durationStr}`
  );
};

export const logRouteCreate = (
  functionName: string,
  method: string,
  path: string,
  itemCount: number,
  user?: LogContext['user'],
  duration?: number
) => {
  const durationStr = duration ? ` | ${duration}ms` : '';
  console.log(
    `[${functionName}] ${getLogTimestamp()} | ${method} ${path} | Created: ${itemCount} items | User: ${formatUserInfo(user)}${durationStr}`
  );
};

export const logRouteUpdate = (
  functionName: string,
  method: string,
  path: string,
  itemCount: number,
  user?: LogContext['user'],
  duration?: number
) => {
  const durationStr = duration ? ` | ${duration}ms` : '';
  console.log(
    `[${functionName}] ${getLogTimestamp()} | ${method} ${path} | Updated: ${itemCount} items | User: ${formatUserInfo(user)}${durationStr}`
  );
};

export const logRouteDelete = (
  functionName: string,
  method: string,
  path: string,
  itemCount: number,
  user?: LogContext['user'],
  duration?: number
) => {
  const durationStr = duration ? ` | ${duration}ms` : '';
  console.log(
    `[${functionName}] ${getLogTimestamp()} | ${method} ${path} | Deleted: ${itemCount} items | User: ${formatUserInfo(user)}${durationStr}`
  );
};

export const logRouteError = (
  functionName: string,
  method: string,
  path: string,
  error: Error | string,
  user?: LogContext['user']
) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(
    `[${functionName}] ${getLogTimestamp()} | ${method} ${path} | ERROR: ${errorMessage} | User: ${formatUserInfo(user)}`
  );
};

export const logRouteWarn = (
  functionName: string,
  method: string,
  path: string,
  message: string,
  user?: LogContext['user']
) => {
  console.warn(
    `[${functionName}] ${getLogTimestamp()} | ${method} ${path} | WARNING: ${message} | User: ${formatUserInfo(user)}`
  );
};

export const extractUserFromRequest = (
  req: NextRequest | null | undefined
): LogContext['user'] | null => {
  try {
    if (!req) return null;

    // Try to get token from cookies
    let token = req.cookies.get('token')?.value;

    // If not in cookies, try Authorization header
    if (!token) {
      const authHeader = req.headers.get('authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) return null;

    // Decode JWT synchronously for logging purposes
    // (Verification happens in withApiAuth or middleware)
    const payload = decodeJwt(token) as {
      _id: string;
      username?: string;
      emailAddress?: string;
      profile?: {
        firstName?: string;
        lastName?: string;
      };
    };

    if (!payload || !payload._id) return null;

    return {
      _id: payload._id,
      username: payload.username,
      emailAddress: payload.emailAddress,
      firstName: payload.profile?.firstName,
      lastName: payload.profile?.lastName,
    };
  } catch {
    return null;
  }
};

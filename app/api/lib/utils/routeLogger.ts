import type { NextRequest } from 'next/server';

interface LogContext {
  functionName: string;
  method: string;
  path: string;
  user?: { _id: string; firstName: string; lastName: string } | null;
  itemCount?: number;
  duration?: number;
  error?: Error | string;
}

const getLogTimestamp = (): string => {
  return new Date().toISOString();
};

const formatUserInfo = (user?: LogContext['user']): string => {
  if (!user) return 'Anonymous';
  return `${user.firstName} ${user.lastName} (${user._id})`;
};

export const logRouteRequest = (
  functionName: string,
  method: string,
  path: string,
  user?: { _id: string; firstName: string; lastName: string } | null
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
  user?: { _id: string; firstName: string; lastName: string } | null,
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
  user?: { _id: string; firstName: string; lastName: string } | null,
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
  user?: { _id: string; firstName: string; lastName: string } | null,
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
  user?: { _id: string; firstName: string; lastName: string } | null,
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
  user?: { _id: string; firstName: string; lastName: string } | null
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
  user?: { _id: string; firstName: string; lastName: string } | null
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
    const userCookie = req.cookies.get('user')?.value;
    if (!userCookie) return null;

    const user = JSON.parse(userCookie);
    return {
      _id: user._id,
      firstName: user.profile?.firstName || 'Unknown',
      lastName: user.profile?.lastName || 'Unknown',
    };
  } catch {
    return null;
  }
};

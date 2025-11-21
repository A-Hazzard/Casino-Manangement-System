import { NextResponse } from 'next/server';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import {
  getUserAccessibleLicenseesFromToken,
  getUserLocationFilter,
} from '@/app/api/lib/helpers/licenseeFilter';
import { hasPageAccess, PageName } from '@/lib/utils/permissions';

type RawUser = Awaited<ReturnType<typeof getUserFromServer>>;

type ApiAuthUser = NonNullable<RawUser> & {
  _id: string;
  roles?: string[];
  rel?: { licencee?: string[] };
  resourcePermissions?: {
    [resource: string]: {
      resources?: unknown[];
    };
  };
};

export type ApiAuthContext = {
  user: ApiAuthUser;
  roles: string[];
  accessibleLicensees: string[] | 'all';
  locationPermissions: string[];
};

export class ApiError extends Error {
  status: number;
  code: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    message: string,
    options?: { code?: string; details?: Record<string, unknown> }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = options?.code ?? 'API_ERROR';
    this.details = options?.details;
  }
}

export function handleApiError(error: unknown) {
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: error.code,
          message: error.message,
        },
        details: error.details,
      },
      { status: error.status }
    );
  }
  return null;
}

export async function requireApiUser(): Promise<ApiAuthUser> {
  const user = (await getUserFromServer()) as ApiAuthUser | null;
  if (!user?._id) {
    throw new ApiError(401, 'Authentication required', {
      code: 'AUTH_REQUIRED',
    });
  }
  return user;
}

function normalizeRoles(roles?: unknown): string[] {
  if (!Array.isArray(roles)) {
    return [];
  }
  return roles
    .filter((role): role is string => typeof role === 'string')
    .map(role => role.toLowerCase());
}

export function assertRoleAccess(
  userRoles: string[],
  allowedRoles: string[],
  message?: string
) {
  if (allowedRoles.length === 0) {
    return;
  }
  const normalizedAllowed = allowedRoles.map(role => role.toLowerCase());
  const hasRole = userRoles.some(role => normalizedAllowed.includes(role));
  if (!hasRole) {
    throw new ApiError(403, message ?? 'Insufficient permissions', {
      code: 'FORBIDDEN',
    });
  }
}

export function assertPageAccess(
  userRoles: string[],
  page: PageName,
  message?: string
) {
  if (hasPageAccess(userRoles, page)) {
    return;
  }
  throw new ApiError(
    403,
    message ?? 'You do not have permission to access this resource',
    {
      code: 'PAGE_FORBIDDEN',
      details: { page },
    }
  );
}

export function assertAnyPageAccess(
  userRoles: string[],
  pages: PageName[],
  message?: string
) {
  const hasAccess = pages.some(page => hasPageAccess(userRoles, page));
  if (hasAccess) {
    return;
  }
  throw new ApiError(
    403,
    message ?? 'You do not have permission to access this resource',
    {
      code: 'PAGE_FORBIDDEN',
      details: { pages },
    }
  );
}

export function assertLicenseeScope(
  licensee: string | null | undefined,
  accessibleLicensees: string[] | 'all'
) {
  if (!licensee || licensee === 'all' || accessibleLicensees === 'all') {
    return;
  }

  if (!accessibleLicensees.includes(licensee)) {
    throw new ApiError(403, 'Unauthorized licensee access', {
      code: 'LICENSEE_FORBIDDEN',
      details: { licensee },
    });
  }
}

export async function buildApiAuthContext(): Promise<ApiAuthContext> {
  const user = await requireApiUser();
  const roles = normalizeRoles(user.roles);
  const accessibleLicensees = await getUserAccessibleLicenseesFromToken(user);
  const locationPermissions = extractLocationPermissions(user);

  return {
    user,
    roles,
    accessibleLicensees,
    locationPermissions,
  };
}

export async function resolveAllowedLocations(
  auth: ApiAuthContext,
  selectedLicensee?: string | null
) {
  return getUserLocationFilter(
    auth.accessibleLicensees,
    selectedLicensee ?? undefined,
    auth.locationPermissions,
    auth.roles
  );
}

function extractLocationPermissions(user: ApiAuthUser): string[] {
  const resources =
    user.resourcePermissions?.['gaming-locations']?.resources ?? [];

  if (!Array.isArray(resources)) {
    return [];
  }

  return resources
    .filter(resource => resource != null)
    .map(resource => String(resource));
}

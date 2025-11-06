import { connectDB } from '@/app/api/lib/middleware/db';
import { getUserIdFromServer, getUserById } from '@/app/api/lib/helpers/users';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';

export type AccessContext = {
  userId: string;
  roles: string[];
  isAdmin: boolean;
  accessibleLocationIds: string[];
  accessibleLicenseeIds: string[];
};

const ACTIVE_LOCATION_FILTER = {
  $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2020-01-01') } }],
};

const ADMIN_ROLES = new Set(['evolution admin', 'admin']);

export async function getAccessContext(): Promise<AccessContext | null> {
  const userId = await getUserIdFromServer();

  if (!userId) {
    return null;
  }

  await connectDB();

  const user = await getUserById(userId);

  if (!user) {
    return null;
  }

  const roles: string[] = Array.isArray(user.roles) ? user.roles : [];
  const isAdmin = roles.some(role => ADMIN_ROLES.has(role));

  const locationResources: string[] =
    user.resourcePermissions?.['gaming-locations']?.resources || [];

  if (isAdmin) {
    return {
      userId,
      roles,
      isAdmin: true,
      accessibleLocationIds: locationResources,
      accessibleLicenseeIds: [],
    };
  }

  if (!locationResources.length) {
    return {
      userId,
      roles,
      isAdmin: false,
      accessibleLocationIds: [],
      accessibleLicenseeIds: [],
    };
  }

  const locations = await GamingLocations.find(
    {
      _id: { $in: locationResources },
      ...ACTIVE_LOCATION_FILTER,
    },
    { _id: 1, 'rel.licencee': 1 }
  )
    .lean()
    .exec();

  const accessibleLicenseeIds = Array.from(
    new Set(
      locations
        .map(location => location.rel?.licencee)
        .filter((value): value is string => Boolean(value))
    )
  );

  return {
    userId,
    roles,
    isAdmin: false,
    accessibleLocationIds: locationResources,
    accessibleLicenseeIds,
  };
}

export function isLicenceeAccessible(
  context: AccessContext | null,
  licenceeId?: string | null
): boolean {
  if (!licenceeId || !context) {
    return false;
  }

  if (context.isAdmin) {
    return true;
  }

  return context.accessibleLicenseeIds.includes(licenceeId);
}

export function constrainLicenceeQuery<T extends Record<string, unknown>>(
  context: AccessContext | null,
  licenceeId?: string | null,
  field: string = 'rel.licencee'
): T | null {
  if (!context) {
    return null;
  }

  if (context.isAdmin) {
    if (licenceeId && licenceeId !== 'all') {
      return { [field]: licenceeId } as T;
    }
    return {} as T;
  }

  if (!context.accessibleLicenseeIds.length) {
    return null;
  }

  if (!licenceeId || licenceeId === 'all') {
    return {
      [field]: { $in: context.accessibleLicenseeIds },
    } as T;
  }

  if (!context.accessibleLicenseeIds.includes(licenceeId)) {
    return null;
  }

  return { [field]: licenceeId } as T;
}


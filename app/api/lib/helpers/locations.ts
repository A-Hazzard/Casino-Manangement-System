/**
 * Location Query Helpers
 * Utilities for building MongoDB query filters and resolving licencee IDs for location data.
 */
import { Licencee } from '@/app/api/lib/models/licencee';

export type LocationQueryFilterParams = {
  licencee: string | null;
  forceAll: boolean;
  showArchived: boolean;
  userRoles: string[];
  userAccessibleLicencees: string[] | 'all';
  userLocationPermissions: string[];
};

/**
 * Builds the deletion filter for location queries.
 * When showArchived is true, returns only recently archived locations.
 * Otherwise returns only active (non-archived) locations.
 */
function buildDeletionFilter(showArchived: boolean): Record<string, unknown> {
  return showArchived
    ? { deletedAt: { $gte: new Date('2025-01-01') } }
    : { $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }] };
}

/**
 * Resolves a licencee identifier (name or MongoDB ID) to its _id string.
 * Returns the original value unchanged if the licencee cannot be found.
 *
 * @param licenceeFilter - Licencee name or ID string.
 * @returns The resolved MongoDB _id as a string.
 */
async function resolveLicenceeId(licenceeFilter: string): Promise<string> {
  let resId = licenceeFilter;
  try {
    const lDoc = await Licencee.findOne(
      {
        $or: [
          { _id: licenceeFilter },
          { name: { $regex: new RegExp(`^${licenceeFilter}$`, 'i') } },
        ],
      },
      { _id: 1 }
    ).lean();
    if (lDoc && !Array.isArray(lDoc)) resId = String(lDoc._id);
  } catch {}
  return resId;
}

/**
 * Appends a licencee filter to a query's $and array.
 * Modifies the queryFilter in place.
 *
 * @param queryFilter - The query filter to append to.
 * @param licenceeFilterToUse - The licencee identifier to filter by.
 */
async function appendLicenceeFilter(
  queryFilter: Record<string, unknown>,
  licenceeFilterToUse: string
): Promise<void> {
  const resId = await resolveLicenceeId(licenceeFilterToUse);
  const andArray = (queryFilter.$and as Array<Record<string, unknown>>) || [];
  andArray.push({ $or: [{ 'rel.licencee': resId }] });
  queryFilter.$and = andArray;
}

/**
 * Builds the full MongoDB query filter for fetching gaming locations.
 * Applies deletion state, user permissions, and licencee filters.
 *
 * @param params - Query parameters including user roles, permissions, and licencee context.
 * @returns A MongoDB query filter object ready to use in GamingLocations.find().
 */
export async function buildLocationQueryFilter(
  params: LocationQueryFilterParams
): Promise<Record<string, unknown>> {
  const {
    licencee,
    forceAll,
    showArchived,
    userRoles,
    userAccessibleLicencees,
    userLocationPermissions,
  } = params;

  const deletionFilter = buildDeletionFilter(showArchived);

  const normalizedRoles = userRoles.map(r => String(r).toLowerCase());
  const isAdminOrDev =
    normalizedRoles.includes('admin') ||
    normalizedRoles.includes('developer') ||
    normalizedRoles.includes('owner');

  const licenceeFilterToUse =
    forceAll && isAdminOrDev
      ? undefined
      : licencee && licencee !== 'all'
        ? licencee
        : undefined;

  // Determine which location IDs the user can access
  const { getUserLocationFilter } = await import('./licenceeFilter');
  const allowedLocationIds = await getUserLocationFilter(
    userAccessibleLicencees,
    licenceeFilterToUse,
    userLocationPermissions,
    userRoles
  );

  const queryFilter: Record<string, unknown> = { ...deletionFilter };

  if (allowedLocationIds !== 'all') {
    if (allowedLocationIds.length === 0) {
      queryFilter._id = null;
    } else {
      queryFilter._id = { $in: allowedLocationIds };
      if (licenceeFilterToUse && licenceeFilterToUse !== 'all') {
        await appendLicenceeFilter(queryFilter, licenceeFilterToUse);
      }
    }
  } else if (licenceeFilterToUse && licenceeFilterToUse !== 'all') {
    await appendLicenceeFilter(queryFilter, licenceeFilterToUse);
  }

  return queryFilter;
}

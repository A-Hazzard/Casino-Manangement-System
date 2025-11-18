import { GamingLocations } from '../models/gaminglocations';
import { Licencee } from '../models/licencee';
import UserModel from '../models/user';
import { getUserFromServer } from './users';

/**
 * Gets the licensees a user can access from JWT token
 * - Returns 'all' for admin/developer
 * - Returns array of licensee IDs for non-admins
 */
export async function getUserAccessibleLicenseesFromToken(): Promise<
  string[] | 'all'
> {
  try {
    const userPayload = await getUserFromServer();

    if (!userPayload) {
      return [];
    }

    const normalizeRoles = (roles: unknown): string[] =>
      Array.isArray(roles)
        ? roles
            .filter((role): role is string => typeof role === 'string')
            .map(role => role?.toLowerCase?.() ?? role)
        : [];

    let roles = normalizeRoles(userPayload.roles);
    let userLicensees =
      ((userPayload.rel as { licencee?: string[] } | undefined)?.licencee ||
        []).map(value => String(value));

    const needsRoleHydration = roles.length === 0;
    const needsLicenseeHydration = userLicensees.length === 0;

    if ((needsRoleHydration || needsLicenseeHydration) && userPayload._id) {
      try {
        const dbUser = (await UserModel.findOne(
          { _id: userPayload._id as string },
          { roles: 1, rel: 1 }
        )
          .lean()
          .exec()) as
          | {
              roles?: unknown;
              rel?: { licencee?: unknown };
            }
          | null;

        if (dbUser) {
          if (needsRoleHydration) {
            roles = normalizeRoles(dbUser.roles);
            if (roles.length === 0) {
              console.warn(
                '[getUserAccessibleLicenseesFromToken] User has no roles stored in DB - treating as non-admin'
              );
            }
          }

          if (needsLicenseeHydration) {
            const rawLicencees = dbUser.rel?.licencee;
            const normalizedRelLicencees = Array.isArray(rawLicencees)
              ? rawLicencees
              : rawLicencees != null
                ? [rawLicencees]
                : [];
            userLicensees = normalizedRelLicencees.map(value => String(value));
          }
        }
      } catch (error) {
        console.error(
          '[getUserAccessibleLicenseesFromToken] Failed to hydrate user details from DB:',
          error
        );
      }
    }

    const isAdmin = roles.includes('admin') || roles.includes('developer');

    if (isAdmin) {
      return 'all';
    }

    if (userLicensees.length === 0) {
      return [];
    }

    const uniqueValues = Array.from(new Set(userLicensees));

    try {
      const licenceeDocs = await Licencee.find(
        {
          $or: [
            { _id: { $in: uniqueValues } },
            { name: { $in: uniqueValues } },
          ],
        },
        { _id: 1, name: 1 }
      )
        .lean()
        .exec();

      const idSet = new Set(licenceeDocs.map(doc => String(doc._id)));
      const nameToId = new Map(
        licenceeDocs.map(doc => [doc.name.toLowerCase(), String(doc._id)])
      );

      const normalizedIds = uniqueValues.reduce<string[]>((acc, value) => {
        if (idSet.has(value)) {
          acc.push(value);
          return acc;
        }

        const mappedId = nameToId.get(value.toLowerCase());
        if (mappedId) {
          acc.push(mappedId);
        } else {
          console.warn(
            '[getUserAccessibleLicenseesFromToken] Unable to resolve licensee identifier:',
            value
          );
        }
        return acc;
      }, []);

      return normalizedIds;
    } catch (error) {
      console.error(
        '[getUserAccessibleLicenseesFromToken] Failed to normalize licensee identifiers:',
        error
      );
      return uniqueValues;
    }
  } catch (error) {
    console.error('[getUserAccessibleLicenseesFromToken] Error:', error);
    return [];
  }
}

/**
 * Applies licensee filter to a MongoDB query
 * Use this for simple queries that filter documents directly
 */
export function applyLicenseeFilter(
  baseQuery: Record<string, unknown>,
  userAccessibleLicensees: string[] | 'all',
  licenseeFieldPath: string = 'rel.licencee'
): Record<string, unknown> {
  if (userAccessibleLicensees === 'all') {
    return baseQuery;
  }

  if (userAccessibleLicensees.length === 0) {
    // User has no licensees - return impossible match
    return { ...baseQuery, _id: null };
  }

  return {
    ...baseQuery,
    [licenseeFieldPath]: { $in: userAccessibleLicensees },
  };
}

/**
 * Applies licensee filter to a MongoDB aggregation pipeline
 * Use this for complex aggregations
 */
export function applyLicenseeFilterToPipeline(
  userAccessibleLicensees: string[] | 'all',
  licenseeFieldPath: string = 'rel.licencee'
): Record<string, unknown> | null {
  if (userAccessibleLicensees === 'all') {
    return null; // No filter needed
  }

  if (userAccessibleLicensees.length === 0) {
    // User has no licensees - return impossible match
    return { $match: { _id: null } };
  }

  return {
    $match: {
      [licenseeFieldPath]: { $in: userAccessibleLicensees },
    },
  };
}

/**
 * Validates if user can access a specific licensee
 * Throws error if unauthorized
 */
export async function validateLicenseeAccess(
  licenseeId: string | undefined,
  userAccessibleLicensees: string[] | 'all'
): Promise<void> {
  if (!licenseeId) {
    return; // No specific licensee requested
  }

  if (userAccessibleLicensees === 'all') {
    return; // Admin can access all
  }

  if (!userAccessibleLicensees.includes(licenseeId)) {
    throw new Error('Unauthorized: You do not have access to this licensee');
  }
}

/**
 * Gets location filter based on licensee access
 * Use this when you need to filter by location IDs
 */
export async function getLicenseeLocationFilter(
  userAccessibleLicensees: string[] | 'all'
): Promise<string[] | 'all'> {
  if (userAccessibleLicensees === 'all') {
    return 'all';
  }

  if (userAccessibleLicensees.length === 0) {
    return [];
  }

  // Get all locations that belong to user's licensees
  const locations = await GamingLocations.find(
    {
      'rel.licencee': { $in: userAccessibleLicensees },
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    },
    { _id: 1 }
  ).lean();

  return locations.map(loc => String(loc._id));
}

/**
 * Gets location filter that intersects licensee-based locations with user's allowed locations
 * This ensures users only see data from locations they have access to within their assigned licensees
 *
 * ROLE-BASED BEHAVIOR:
 * - Admin/Developer: See all locations (or restricted by location permissions if assigned)
 * - Manager: See ALL locations for their assigned licensees (location permissions ignored)
 * - Collector/Technician: See only intersection of licensee locations + their assigned locations
 *
 * @param userAccessibleLicensees - Licensees the user has access to ('all' for admins)
 * @param selectedLicenseeFilter - The licensee filter selected in the UI (optional)
 * @param userLocationPermissions - Specific locations the user can access
 * @param userRoles - User's roles (to determine if they're a manager)
 * @returns Array of location IDs or 'all' for admins with no restrictions
 */
export async function getUserLocationFilter(
  userAccessibleLicensees: string[] | 'all',
  selectedLicenseeFilter: string | undefined,
  userLocationPermissions: string[],
  userRoles: string[] = []
): Promise<string[] | 'all'> {
  // Check if user is admin, manager, or location admin
  const normalizedRoles = userRoles.map(role =>
    role?.toLowerCase?.() ?? role
  );
  const isAdmin =
    userAccessibleLicensees === 'all' ||
    normalizedRoles.includes('admin') ||
    normalizedRoles.includes('developer');
  const isManager = normalizedRoles.includes('manager');
  const isLocationAdmin = normalizedRoles.includes('location admin');

  console.log('[getUserLocationFilter] User roles:', userRoles);
  console.log('[getUserLocationFilter] Is Admin:', isAdmin);
  console.log('[getUserLocationFilter] Is Manager:', isManager);
  console.log(
    '[getUserLocationFilter] Selected licensee filter:',
    selectedLicenseeFilter
  );

  if (isAdmin) {
    const hasSpecificLicensee =
      selectedLicenseeFilter &&
      selectedLicenseeFilter !== '' &&
      selectedLicenseeFilter !== 'all';
    if (!hasSpecificLicensee) {
      console.log(
        '[getUserLocationFilter] Admin user detected with no specific licensee filter - granting access to all locations'
      );
      return 'all';
    }
    console.log(
      '[getUserLocationFilter] Admin user with specific licensee filter - continuing with licensee-based filtering'
    );
  }

  // Get locations from selected licensee or all user's licensees
  let licenseeLocations: string[] | 'all';

  if (
    selectedLicenseeFilter &&
    selectedLicenseeFilter !== '' &&
    selectedLicenseeFilter !== 'all'
  ) {
    // Filter by specific licensee (even for admins - they can use dropdown to filter)
    const locations = await GamingLocations.find(
      {
        'rel.licencee': selectedLicenseeFilter,
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2020-01-01') } },
        ],
      },
      { _id: 1 }
    ).lean();
    licenseeLocations = locations.map(loc => String(loc._id));
    console.log(
      '[getUserLocationFilter] Filtered by specific licensee:',
      selectedLicenseeFilter,
      '- Found',
      licenseeLocations.length,
      'locations'
    );
  } else {
    // Get all locations from user's licensees
    licenseeLocations = await getLicenseeLocationFilter(
      userAccessibleLicensees
    );
    console.log(
      '[getUserLocationFilter] All licensee locations:',
      licenseeLocations === 'all' ? 'all' : licenseeLocations.length
    );
  }

  // If licenseeLocations is 'all', check if user has location restrictions
  if (licenseeLocations === 'all') {
    // Admin user - check if they have location restrictions
    const result =
      userLocationPermissions.length > 0 ? userLocationPermissions : 'all';
    console.log(
      '[getUserLocationFilter] Admin user - result:',
      result === 'all' ? 'all' : result.length
    );
    return result;
  }

  // LOCATION ADMINS see ONLY their assigned locations (intersect with location permissions)
  if (isLocationAdmin) {
    if (userLocationPermissions.length > 0) {
      // Intersect licensee locations with location admin's assigned locations
      const intersection = licenseeLocations.filter(id =>
        userLocationPermissions.includes(id)
      );
      console.log(
        '[getUserLocationFilter] Location Admin - returning assigned locations:',
        intersection.length
      );
      return intersection;
    }
    // Location admin with no location permissions should see nothing
    console.warn(
      '[getUserLocationFilter] ⚠️ Location Admin with NO location permissions - returning empty array!'
    );
    return [];
  }

  // MANAGERS OR ADMINS see ALL locations for their assigned/selected licensees (no location permission intersection)
  if (isManager || isAdmin) {
    console.log(
      '[getUserLocationFilter] Manager/Admin - returning ALL licensee locations:',
      licenseeLocations.length
    );
    return licenseeLocations;
  }

  // NON-MANAGERS, NON-ADMINS (collectors, technicians) must intersect with location permissions
  if (userLocationPermissions.length > 0) {
    console.log(
      '[getUserLocationFilter] Non-manager - intersecting locations:'
    );
    console.log('  Licensee locations:', licenseeLocations);
    console.log('  User location permissions:', userLocationPermissions);

    const intersection = licenseeLocations.filter(id =>
      userLocationPermissions.includes(id)
    );

    console.log('  Intersection result:', intersection);

    if (intersection.length === 0) {
      console.warn('[getUserLocationFilter] ⚠️ No locations in intersection!');
      console.warn(
        "  This means the user's allowed location(s) don't belong to their assigned licensees"
      );
      console.warn('  User needs either:');
      console.warn(
        '    1. Location assigned that belongs to one of their licensees, OR'
      );
      console.warn(
        '    2. Licensee assigned that owns their allowed location(s)'
      );
    }

    return intersection;
  }

  // Non-manager, non-admin with NO location permissions should see NOTHING
  console.warn(
    '[getUserLocationFilter] ⚠️ Non-manager/admin with NO location permissions - returning empty array!'
  );
  console.warn('  User needs specific location assignments to see any data');
  return [];
}

/**
 * Checks if a user has access to a specific location ID
 * @param locationId - The location ID to check access for
 * @returns Promise resolving to true if user has access, false otherwise
 */
export async function checkUserLocationAccess(
  locationId: string
): Promise<boolean> {
  try {
    const user = await getUserFromServer();
    if (!user) {
      return false;
    }

    const userRoles = (user.roles as string[]) || [];
    const userAccessibleLicensees =
      ((user.rel as Record<string, unknown>)?.licencee as string[]) || [];
    const userLocationPermissions =
      ((user.resourcePermissions as Record<string, Record<string, unknown>>)?.[
        'gaming-locations'
      ]?.resources as string[]) || [];

    const isAdmin =
      userRoles.includes('admin') || userRoles.includes('developer');

    // Get user's accessible locations
    const allowedLocationIds = await getUserLocationFilter(
      isAdmin ? 'all' : userAccessibleLicensees,
      undefined, // No specific licensee filter for direct location access check
      userLocationPermissions,
      userRoles
    );

    // Check if location is in allowed list
    if (allowedLocationIds === 'all') {
      return true; // Admin with no restrictions
    }

    // Normalize locationId to string for comparison
    const normalizedLocationId = String(locationId);
    return allowedLocationIds.includes(normalizedLocationId);
  } catch (error) {
    console.error('Error checking location access:', error);
    return false;
  }
}

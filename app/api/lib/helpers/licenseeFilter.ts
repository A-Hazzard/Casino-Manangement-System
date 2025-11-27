import { connectDB } from '../middleware/db';
import { GamingLocations } from '../models/gaminglocations';
import { Licencee } from '../models/licencee';
import UserModel from '../models/user';
import { getUserFromServer } from './users';

/**
 * Gets the licensees a user can access from JWT token
 * - Returns 'all' for admin/developer
 * - Returns array of licensee IDs for non-admins
 */
export async function getUserAccessibleLicenseesFromToken(userPayloadOverride?: {
  assignedLicensees?: string[];
  roles?: string[];
}): Promise<string[] | 'all'> {
  try {
    const userPayload = userPayloadOverride || (await getUserFromServer());

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

    // Use only new field
    let userLicensees: string[] = [];
    if (
      Array.isArray(
        (userPayload as { assignedLicensees?: string[] }).assignedLicensees
      )
    ) {
      userLicensees = (
        userPayload as { assignedLicensees: string[] }
      ).assignedLicensees.map(value => String(value));
    }

    const needsRoleHydration = roles.length === 0;
    const needsLicenseeHydration = userLicensees.length === 0;

    // Check if userPayload has _id (it won't if it's userPayloadOverride)
    const userId =
      '_id' in userPayload ? (userPayload as { _id: string })._id : null;

    if ((needsRoleHydration || needsLicenseeHydration) && userId) {
      try {
        const dbUser = (await UserModel.findOne(
          { _id: userId },
          { roles: 1, assignedLicensees: 1 }
        )
          .lean()
          .exec()) as {
          roles?: unknown;
          assignedLicensees?: string[];
        } | null;

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
            // Use only new field
            if (
              Array.isArray(dbUser.assignedLicensees) &&
              dbUser.assignedLicensees.length > 0
            ) {
              userLicensees = dbUser.assignedLicensees.map(value =>
                String(value)
              );
            }
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
  console.log('🔍 [getLicenseeLocationFilter] Input:', {
    userAccessibleLicensees,
    isAll: userAccessibleLicensees === 'all',
    isArray: Array.isArray(userAccessibleLicensees),
    length: Array.isArray(userAccessibleLicensees)
      ? userAccessibleLicensees.length
      : 0,
  });

  if (userAccessibleLicensees === 'all') {
    console.log('🔍 [getLicenseeLocationFilter] Returning "all"');
    return 'all';
  }

  if (userAccessibleLicensees.length === 0) {
    console.log(
      '🔍 [getLicenseeLocationFilter] No licensees - returning empty array'
    );
    return [];
  }

  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  console.log(
    '🔍 [getLicenseeLocationFilter] Querying locations for licensees:',
    userAccessibleLicensees
  );
  const locations = await GamingLocations.find(
    {
      'rel.licencee': { $in: userAccessibleLicensees },
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
      ],
    },
    { _id: 1, name: 1, 'rel.licencee': 1 }
  ).lean();

  const locationIds = locations.map(loc => String(loc._id));
  console.log('🔍 [getLicenseeLocationFilter] Found locations:', {
    count: locationIds.length,
    firstFew: locations
      .slice(0, 5)
      .map(
        (loc: {
          _id: unknown;
          name?: string;
          rel?: { licencee?: string };
        }) => ({
          _id: String(loc._id),
          name: loc.name,
          licensee: loc.rel?.licencee,
        })
      ),
  });

  return locationIds;
}

/**
 * Gets location filter that intersects licensee-based locations with user's allowed locations
 * This ensures users only see data from locations they have access to within their assigned licensees
 *
 * ROLE-BASED BEHAVIOR:
 * - Admin/Developer: See all locations (or restricted by location permissions if assigned)
 * - Manager: See ALL locations for their assigned licensees (location permissions ignored)
 * - Location Admin: See ONLY their assigned locations (no licensee filtering - assigned locations are source of truth)
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
  const normalizedRoles = userRoles.map(role => role?.toLowerCase?.() ?? role);
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
    // For non-admin users, validate that they have access to the selected licensee
    if (!isAdmin && Array.isArray(userAccessibleLicensees)) {
      const normalizedSelected = String(selectedLicenseeFilter).trim();
      const normalizedAccessible = userAccessibleLicensees.map(id =>
        String(id).trim()
      );

      if (!normalizedAccessible.includes(normalizedSelected)) {
        console.warn(
          `[getUserLocationFilter] ⚠️ User attempted to access licensee they don't have access to: ${selectedLicenseeFilter}`
        );
        console.warn(
          `[getUserLocationFilter] User's accessible licensees:`,
          normalizedAccessible
        );
        console.warn(
          `[getUserLocationFilter] Ignoring invalid licensee filter and using user's assigned licensees instead`
        );
        // Ignore the invalid licensee filter and use user's assigned licensees
        selectedLicenseeFilter = undefined;
      }
    }

    // Filter by specific licensee (even for admins - they can use dropdown to filter)
    // First, try to resolve the licensee filter (could be ID or name)
    let licenseeId = selectedLicenseeFilter;

    // Check if it's a name by trying to find the licensee by name
    try {
      const licenseeDoc = await Licencee.findOne(
        {
          $or: [
            { _id: selectedLicenseeFilter },
            {
              name: { $regex: new RegExp(`^${selectedLicenseeFilter}$`, 'i') },
            },
          ],
        },
        { _id: 1 }
      ).lean();

      if (licenseeDoc && !Array.isArray(licenseeDoc)) {
        licenseeId = String(licenseeDoc._id);
        console.log(
          '[getUserLocationFilter] Resolved licensee filter:',
          selectedLicenseeFilter,
          '->',
          licenseeId
        );
      }
    } catch (error) {
      console.warn(
        '[getUserLocationFilter] Failed to resolve licensee, using as-is:',
        selectedLicenseeFilter,
        error
      );
    }

    // Now query locations by licensee ID
    // rel.licencee is stored as a String, so we can query directly
    const locations = await GamingLocations.find(
      {
        'rel.licencee': licenseeId,
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
      '(ID:',
      licenseeId,
      ') - Found',
      licenseeLocations.length,
      'locations'
    );
  } else {
    // Get all locations from user's licensees
    console.log(
      '🔍 [getUserLocationFilter] Getting all locations from user licensees:',
      userAccessibleLicensees
    );
    licenseeLocations = await getLicenseeLocationFilter(
      userAccessibleLicensees
    );
    console.log(
      '🔍 [getUserLocationFilter] All licensee locations:',
      licenseeLocations === 'all'
        ? 'all'
        : `${licenseeLocations.length} locations`
    );
    if (Array.isArray(licenseeLocations) && licenseeLocations.length > 0) {
      console.log(
        '🔍 [getUserLocationFilter] Licensee location IDs (first 10):',
        licenseeLocations.slice(0, 10)
      );
    }
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

  // LOCATION ADMINS see their assigned locations OR all locations from their assigned licensees
  // If they have specific location assignments, use those. Otherwise, show all locations from their licensees.
  if (isLocationAdmin) {
    if (userLocationPermissions.length > 0) {
      // Return location admin's assigned locations directly (no licensee filtering)
      // This allows location admins to see their assigned locations even if they belong to different licensees
      console.log(
        '[getUserLocationFilter] Location Admin - returning assigned locations directly:',
        userLocationPermissions.length
      );
      return userLocationPermissions;
    }
    // Location admin with no specific location assignments should see all locations from their assigned licensees
    // This is a fallback for location admins who are assigned to a licensee but don't have specific location restrictions
    console.log(
      '[getUserLocationFilter] Location Admin with no specific location assignments - falling back to licensee locations:',
      Array.isArray(licenseeLocations) ? licenseeLocations.length : 'all'
    );
    return licenseeLocations;
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
      '[getUserLocationFilter] 🔍 COLLECTOR/TECHNICIAN - Intersecting locations:'
    );
    console.log('  📍 Licensee locations count:', licenseeLocations.length);
    console.log(
      '  📍 Licensee locations (first 10):',
      licenseeLocations.slice(0, 10)
    );
    console.log(
      '  👤 User location permissions count:',
      userLocationPermissions.length
    );
    console.log('  👤 User location permissions:', userLocationPermissions);

    // Normalize IDs to strings for comparison (trim whitespace and convert to lowercase for comparison)
    // Create a map of normalized -> original for licensee locations
    const licenseeLocationMap = new Map<string, string>();
    licenseeLocations.forEach(id => {
      const normalized = String(id).trim().toLowerCase();
      if (!licenseeLocationMap.has(normalized)) {
        licenseeLocationMap.set(normalized, String(id));
      }
    });

    const normalizedLicenseeLocations = Array.from(licenseeLocationMap.keys());
    const normalizedUserPermissions = userLocationPermissions.map(id =>
      String(id).trim().toLowerCase()
    );

    console.log(
      '  🔄 Normalized licensee locations (first 5):',
      normalizedLicenseeLocations.slice(0, 5)
    );
    console.log('  🔄 Normalized user permissions:', normalizedUserPermissions);

    // Perform case-insensitive intersection
    const intersectionNormalized = normalizedLicenseeLocations.filter(id =>
      normalizedUserPermissions.includes(id)
    );

    // Map back to original format (use the licensee locations format as source of truth)
    const intersectionResult = intersectionNormalized
      .map(normalized => licenseeLocationMap.get(normalized)!)
      .filter(Boolean);

    console.log('  ✅ Intersection result count:', intersectionResult.length);
    console.log('  ✅ Intersection result:', intersectionResult);

    if (intersectionResult.length === 0) {
      console.warn(
        '[getUserLocationFilter] ⚠️⚠️⚠️ NO LOCATIONS IN INTERSECTION! ⚠️⚠️⚠️'
      );
      console.warn(
        "  This means the user's allowed location(s) don't belong to their assigned licensees"
      );
      console.warn('  Checking for partial matches...');

      // Check if any user permissions match any licensee locations (case-insensitive)
      const partialMatches = normalizedUserPermissions.filter(userId =>
        normalizedLicenseeLocations.some(licenseeId => userId === licenseeId)
      );

      if (partialMatches.length > 0) {
        console.warn('  ⚠️ Found case-insensitive matches:', partialMatches);
        console.warn('  ⚠️ This suggests an ID format mismatch issue');
      }

      console.warn('  User needs either:');
      console.warn(
        '    1. Location assigned that belongs to one of their licensees, OR'
      );
      console.warn(
        '    2. Licensee assigned that owns their allowed location(s)'
      );
    }

    return intersectionResult;
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

    // Use only new field
    let userAccessibleLicensees: string[] = [];
    if (
      Array.isArray(
        (user as { assignedLicensees?: string[] }).assignedLicensees
      )
    ) {
      userAccessibleLicensees = (user as { assignedLicensees: string[] })
        .assignedLicensees;
    }

    // Use only new field
    let userLocationPermissions: string[] = [];
    if (
      Array.isArray(
        (user as { assignedLocations?: string[] }).assignedLocations
      )
    ) {
      userLocationPermissions = (user as { assignedLocations: string[] })
        .assignedLocations;
    }

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

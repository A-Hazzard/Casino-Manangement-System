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
  if (userAccessibleLicensees === 'all') {
    return 'all';
  }

  if (userAccessibleLicensees.length === 0) {
    return [];
  }

  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

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

  if (isAdmin) {
    const hasSpecificLicensee =
      selectedLicenseeFilter &&
      selectedLicenseeFilter !== '' &&
      selectedLicenseeFilter !== 'all';
    if (!hasSpecificLicensee) {
      return 'all';
    }
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
      }
    } catch {
      // Failed to resolve licensee - use as-is
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
  } else {
    // Get all locations from user's licensees
    licenseeLocations = await getLicenseeLocationFilter(
      userAccessibleLicensees
    );
  }

  // If licenseeLocations is 'all', check if user has location restrictions
  if (licenseeLocations === 'all') {
    // Admin user - check if they have location restrictions
    return userLocationPermissions.length > 0 ? userLocationPermissions : 'all';
  }

  // LOCATION ADMINS see their assigned locations OR all locations from their assigned licensees
  if (isLocationAdmin) {
    if (userLocationPermissions.length > 0) {
      return userLocationPermissions;
    }
    return licenseeLocations;
  }

  // MANAGERS OR ADMINS see ALL locations for their assigned/selected licensees
  if (isManager || isAdmin) {
    return licenseeLocations;
  }

  // NON-MANAGERS, NON-ADMINS (collectors, technicians) must intersect with location permissions
  if (userLocationPermissions.length > 0) {
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

    // Perform case-insensitive intersection
    const intersectionNormalized = normalizedLicenseeLocations.filter(id =>
      normalizedUserPermissions.includes(id)
    );

    // Map back to original format
    return intersectionNormalized
      .map(normalized => licenseeLocationMap.get(normalized)!)
      .filter(Boolean);
  }

  // Non-manager, non-admin with NO location permissions should see NOTHING
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

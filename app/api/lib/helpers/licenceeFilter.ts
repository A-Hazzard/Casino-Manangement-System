import { User } from '@/lib/types/administration';
import { connectDB } from '../middleware/db';
import { GamingLocations } from '../models/gaminglocations';
import { Licencee } from '../models/licencee';
import UserModel from '../models/user';
import { getUserFromServer } from './users';
import type { LocationDocument } from '@/lib/types/common';

/**
 * Gets the licencees a user can access from JWT token
 * - Returns 'all' for admin/developer
 * - Returns array of licencee IDs for non-admins
 */
export async function getUserAccessibleLicenceesFromToken(userPayloadOverride?: {
  assignedLicencees?: string[];
  roles?: string[];
}): Promise<string[] | 'all'> {
  try {
    const userPayload = userPayloadOverride || (await getUserFromServer());

    if (!userPayload) {
      return [];
    }

    let roles = (userPayload.roles as string[]) || [];

    // Use only new field
    let userLicencees: string[] = [];
    const payload = userPayload as { assignedLicencees?: string[] };
    const rawLicencees = payload.assignedLicencees;

    if (Array.isArray(rawLicencees)) {
      userLicencees = rawLicencees.map(value => String(value));
    }

    const needsRoleHydration = roles.length === 0;
    const needsLicenceeHydration = userLicencees.length === 0;

    // Check if userPayload has _id (it won't if it's userPayloadOverride)
    const userId =
      '_id' in userPayload ? (userPayload as { _id: string })._id : null;

    if ((needsRoleHydration || needsLicenceeHydration) && userId) {
      try {
        const dbUser = await UserModel.findOne(
          { _id: userId },
          { roles: 1, assignedLicencees: 1 }
        ).lean().exec() as {
          roles?: unknown;
          assignedLicencees?: string[];
        } | null;

        if (dbUser) {
          if (needsRoleHydration) {
            roles = (dbUser.roles as string[]) || [];
            if (roles.length === 0) {
              console.warn(
                '[getUserAccessibleLicenceesFromToken] User has no roles stored in DB - treating as non-admin'
              );
            }
          }

          if (needsLicenceeHydration) {
            // Use only new field
            const rawDbLicencees = dbUser.assignedLicencees;
            if (
              Array.isArray(rawDbLicencees) &&
              rawDbLicencees.length > 0
            ) {
              userLicencees = rawDbLicencees.map(value =>
                String(value)
              );
            }
          }
        }
      } catch (error) {
        console.error(
          '[getUserAccessibleLicenceesFromToken] Failed to hydrate user details from DB:',
          error
        );
      }
    }

    const isAdmin = roles.includes('admin') || roles.includes('developer');

    if (isAdmin) {
      return 'all';
    }

    if (userLicencees.length === 0) {
      return [];
    }

    const uniqueValues = Array.from(new Set(userLicencees));

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
            '[getUserAccessibleLicenceesFromToken] Unable to resolve licencee identifier:',
            value
          );
        }
        return acc;
      }, []);

      return normalizedIds;
    } catch (error) {
      console.error(
        '[getUserAccessibleLicenceesFromToken] Failed to normalize licencee identifiers:',
        error
      );
      return uniqueValues;
    }
  } catch (error) {
    console.error('[getUserAccessibleLicenceesFromToken] Error:', error);
    return [];
  }
}


/**
 * Gets location filter based on licencee access
 * Use this when you need to filter by location IDs
 */
async function getLicenceeLocationFilter(
  userAccessibleLicencees: string[] | 'all'
): Promise<string[] | 'all'> {
  if (userAccessibleLicencees === 'all') {
    return 'all';
  }

  if (userAccessibleLicencees.length === 0) {
    return [];
  }

  const db = await connectDB();
  if (!db) {
    throw new Error('Database connection failed');
  }

  const locations = (await GamingLocations.find(
    {
      $and: [
        {
          'rel.licencee': { $in: userAccessibleLicencees },
        },
        {
          $or: [
            { deletedAt: null },
            { deletedAt: { $lt: new Date('2025-01-01') } },
          ],
        }
      ]
    },
    { _id: 1 }
  ).lean()) as unknown as Pick<LocationDocument, '_id'>[];

  return locations.map(loc => String(loc._id));
}

/**
 * Gets location filter that intersects licencee-based locations with user's allowed locations
 * This ensures users only see data from locations they have access to within their assigned licencees
 *
 * ROLE-BASED BEHAVIOR:
 * - Admin/Developer: See all locations (or restricted by location permissions if assigned)
 * - Manager: See ALL locations for their assigned licencees (location permissions ignored)
 * - Location Admin: See ONLY their assigned locations (no licencee filtering - assigned locations are source of truth)
 * - Collector/Technician: See only intersection of licencee locations + their assigned locations
 *
 * @param userAccessibleLicencees - Licencees the user has access to ('all' for admins)
 * @param selectedLicenceeFilter - The licencee filter selected in the UI (optional)
 * @param userLocationPermissions - Specific locations the user can access
 * @param userRoles - User's roles (to determine if they're a manager)
 * @returns Array of location IDs or 'all' for admins with no restrictions
 */
export async function getUserLocationFilter(
  userAccessibleLicencees: 'all' | string[],
  selectedLicenceeFilter: string | undefined,
  userLocationPermissions: string[],
  userRoles: User['roles'] = []
): Promise<string[] | 'all'> {
  // Check if user is admin, manager, or location admin
  const isAdmin = userAccessibleLicencees === 'all';
  const isManager = userRoles.includes('manager');
  const isVaultManager = userRoles.includes('vault-manager');
  const isCashier = userRoles.includes('cashier');
  const isLocationAdmin = userRoles.includes('location admin');

  if (isAdmin) {
    const hasSpecificLicencee =
      selectedLicenceeFilter &&
      selectedLicenceeFilter !== '' &&
      selectedLicenceeFilter !== 'all';
    
    if (!hasSpecificLicencee) return 'all';
  }

  // Get locations from selected licencee or all user's licencees
  let licenceeLocations: 'all' | string[];

  if (
    selectedLicenceeFilter &&
    selectedLicenceeFilter !== '' &&
    selectedLicenceeFilter !== 'all'
  ) {
    // For non-admin users, validate that they have access to the selected licencee
    if (!isAdmin && Array.isArray(userAccessibleLicencees)) {
      const normalizedSelected = String(selectedLicenceeFilter).trim();
      const normalizedAccessible = userAccessibleLicencees.map(id =>
        String(id).trim()
      );

      if (!normalizedAccessible.includes(normalizedSelected)) {
        // Ignore the invalid licencee filter and use user's assigned licencees
        selectedLicenceeFilter = undefined;
      }
    }

    // Filter by specific licencee (even for admins - they can use dropdown to filter)
    // First, try to resolve the licencee filter (could be ID or name)
    let licenceeId = selectedLicenceeFilter;

    // Check if it's a name by trying to find the licencee by name
    try {
      const licenceeDoc = await Licencee.findOne(
        {
          $or: [
            { _id: selectedLicenceeFilter },
            {
              name: { $regex: new RegExp(`^${selectedLicenceeFilter}$`, 'i') },
            },
          ],
        },
        { _id: 1 }
      ).lean();

      if (licenceeDoc && !Array.isArray(licenceeDoc)) {
        licenceeId = String(licenceeDoc._id);
      }
    } catch {
      // Failed to resolve licencee - use as-is
    }

    // Now query locations by licencee ID
    // rel.licencee is stored as a String, so we can query directly
    const locations = await GamingLocations.find(
      {
        $and: [
          {
            'rel.licencee': licenceeId,
          },
          {
            $or: [
              { deletedAt: null },
              { deletedAt: { $lt: new Date('2025-01-01') } },
            ],
          }
        ]
      },
      { _id: 1 }
    ).lean();
    licenceeLocations = locations.map(loc => String(loc._id));
  } else {
    // Get all locations from user's licencees
    licenceeLocations = await getLicenceeLocationFilter(
      userAccessibleLicencees
    );
  }

  // CRITICAL: Developers and Admins skip all individual location permissions
  // they only respect the licencee filter (if one is active)
  if (isAdmin) return licenceeLocations;

  // If licenceeLocations is 'all', check if user has location restrictions
  if (licenceeLocations === 'all') {
    // Only reachable by non-admins now
    return userLocationPermissions.length > 0 ? userLocationPermissions : 'all';
  }

  // VAULT MANAGERS, CASHIERS and LOCATION ADMINS see their assigned locations
  if (isLocationAdmin || isVaultManager || isCashier) {
    if (userLocationPermissions.length > 0) {
      return userLocationPermissions.map(id => String(id).trim());
    }
    return licenceeLocations;
  }

  // MANAGERS see ALL locations for their assigned/selected licencees
  if (isManager) {
    return licenceeLocations;
  }

  // NON-MANAGERS, NON-ADMINS (collectors, technicians) must intersect with location permissions
  if (userLocationPermissions.length > 0) {
    // Create a map of normalized -> original for licencee locations
    const licenceeLocationMap = new Map<string, string>();
    licenceeLocations.forEach(id => {
      const normalized = String(id).trim().toLowerCase();
      if (!licenceeLocationMap.has(normalized)) {
        licenceeLocationMap.set(normalized, String(id));
      }
    });

    const normalizedLicenceeLocations = Array.from(licenceeLocationMap.keys());
    const normalizedUserPermissions = userLocationPermissions.map(id =>
      String(id).trim().toLowerCase()
    );

    // Perform case-insensitive intersection
    const intersectionNormalized = normalizedLicenceeLocations.filter(id =>
      normalizedUserPermissions.includes(id)
    );

    // Map back to original format
    return intersectionNormalized
      .map(normalized => licenceeLocationMap.get(normalized)!)
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
    if (!user) return false;
    
    const userRoles = (user.roles as User['roles']) || [];

    const userPayload = user as User;
    const userAccessibleLicencees = userPayload.assignedLicencees || [];
    const userLocationPermissions = userPayload.assignedLocations || [];

    const isAdmin = userRoles.includes('admin') || userRoles.includes('developer');

    // Get user's accessible locations
    const allowedLocationIds = await getUserLocationFilter(
      isAdmin ? 'all' : userAccessibleLicencees,
      undefined, // No specific licencee filter for direct location access check
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


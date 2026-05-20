import mongoose from 'mongoose';
import { ActivityLog } from '../models/activityLog';
import type { ActivityLogChange } from '@/shared/types/activityLog';

/**
 * Simple activity logger for auth events and other simple logging needs
 */
export async function logActivity(params: {
  action: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  userId?: string;
  username?: string;
  membershipLog?: boolean;
}): Promise<string> {
  if (!params?.action || !params?.details) {
    console.error('[logActivity] action and details are required');
    throw new Error('[logActivity] action and details are required');
  }
  try {
    // Extract resource info from metadata if available (ensure lowercase)
    const resource = (
      (params.metadata?.resource as string) || 'session'
    ).toLowerCase();
    const resourceId = (params.metadata?.resourceId as string) || 'auth';
    const resourceName =
      (params.metadata?.resourceName as string) || 'Authentication';
    const changes =
      (params.metadata?.changes as Array<{
        field: string;
        oldValue: unknown;
        newValue: unknown;
      }>) || [];

    // Validate and extract user information
    // For auth failures (login attempts) and background operations, allow 'unknown' values
    const userId = params.userId || 'unknown';
    let username = params.username || 'unknown';

    if (userId && userId !== 'unknown' && userId.match(/^[0-9a-fA-F]{24}$/)) {
      try {
        const UserModel = (await import('../models/user')).default;
        const dbUser = await UserModel.findOne({ _id: userId }).lean<{
          username?: string;
          emailAddress?: string;
          profile?: { firstName?: string; lastName?: string };
        }>();
        if (dbUser) {
          if (dbUser.profile?.firstName && dbUser.profile?.lastName) {
            username = `${dbUser.profile.firstName} ${dbUser.profile.lastName}`;
          } else if (dbUser.username) {
            username = dbUser.username;
          } else if (dbUser.emailAddress) {
            username = dbUser.emailAddress;
          }
        }
      } catch (err) {
        console.error(
          '[logActivity] Failed to fetch display name from DB:',
          err
        );
      }
    }

    // Log when user information is missing but don't throw error for background operations
    if (!params.userId || !params.username) {
      console.warn('⚠️ Activity logging with incomplete user information');
      console.warn('⚠️ userId:', params.userId, 'username:', params.username);
      console.warn('⚠️ Action:', params.action);
    }

    const activityLog = await ActivityLog.create({
      _id: new mongoose.Types.ObjectId().toString(),
      timestamp: new Date(),
      // Required fields
      userId: userId,
      username: username,
      action: params.action.toLowerCase(),
      resource: resource,
      resourceId: resourceId,
      resourceName: resourceName,
      membershipLog: params.membershipLog || false,
      // Optional fields
      details: params.details,
      ipAddress: params.ipAddress || 'unknown',
      userAgent: params.userAgent || 'unknown',
      previousData: params.metadata?.previousData,
      newData: params.metadata?.newData,
      // Legacy fields for backward compatibility
      actor: {
        id: params.userId,
        email: params.username,
        role: 'user',
      },
      actionType: params.action.toUpperCase(),
      entityType: resource.charAt(0).toUpperCase() + resource.slice(1),
      entity: {
        id: resourceId,
        name: resourceName,
      },
      description: params.details,
      changes: changes,
      metadata: {
        ...params.metadata,
        timestamp: new Date().toISOString(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.warn('✅ Activity logged successfully:', activityLog._id);
    return activityLog._id;
  } catch (error) {
    console.error(
      '[logActivity] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    // Re-throw the error to ensure the calling code knows logging failed
    throw error;
  }
}

/**
 * Calculates changes between two objects.
 * Only compares fields that exist in the newObj (update payload).
 * This prevents logging all fields as changed when only specific fields are updated.
 *
 * @param {Record<string, unknown>} oldObj - The original object
 * @param {Record<string, unknown>} newObj - The updated object (should only contain fields being updated)
 * @returns {ActivityLogChange[]} Array of changes
 */
export function calculateChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): ActivityLogChange[] {
  if (
    !oldObj ||
    typeof oldObj !== 'object' ||
    !newObj ||
    typeof newObj !== 'object'
  ) {
    console.error('[calculateChanges] oldObj and newObj are required objects');
    return [];
  }

  // Skip internal/bookkeeping fields that should never appear as user-visible changes
  const IGNORED_FIELDS = new Set(['updatedAt', '__v', '__t']);

  // Resolve a dot-notation path (e.g. 'collectionMeters.metersIn') against a
  // nested object. Returns undefined when the path does not exist.
  function resolveDotPath(
    obj: Record<string, unknown>,
    dotPath: string
  ): unknown {
    return dotPath.split('.').reduce<unknown>((current, segment) => {
      if (current == null || typeof current !== 'object') return undefined;
      return (current as Record<string, unknown>)[segment];
    }, obj);
  }

  function getFlatChanges(
    old: Record<string, unknown>,
    updated: Record<string, unknown>,
    prefix = ''
  ): ActivityLogChange[] {
    const result: ActivityLogChange[] = [];

    const isPlainObject = (val: unknown): val is Record<string, unknown> =>
      typeof val === 'object' &&
      val !== null &&
      !Array.isArray(val) &&
      !(val instanceof Date) &&
      Object.prototype.toString.call(val) === '[object Object]';

    for (const [key, newValue] of Object.entries(updated)) {
      // Skip bookkeeping fields — they change on every save and are not user-editable
      if (!prefix && IGNORED_FIELDS.has(key)) continue;

      const fieldPath = prefix ? `${prefix}.${key}` : key;

      // When the key itself contains dots it is a MongoDB dot-notation path
      // (e.g. 'collectionMeters.metersIn'). Resolve the path against the old
      // document so we compare the right nested value instead of always getting
      // undefined (which would mark every dot-notation key as changed).
      const isDotNotationKey = !prefix && key.includes('.');
      const oldValue = isDotNotationKey
        ? resolveDotPath(old, key)
        : old
          ? old[key]
          : undefined;

      if (
        !isDotNotationKey &&
        isPlainObject(newValue) &&
        isPlainObject(oldValue)
      ) {
        const nestedChanges = getFlatChanges(
          oldValue as Record<string, unknown>,
          newValue as Record<string, unknown>,
          fieldPath
        );
        result.push(...nestedChanges);
      } else {
        if (!isEqual(oldValue, newValue)) {
          result.push({
            field: fieldPath,
            oldValue,
            newValue,
          });
        }
      }
    }

    return result;
  }

  return getFlatChanges(oldObj, newObj);
}

/**
 * Deep equality check for comparing values
 */
function isEqual(a: unknown, b: unknown): boolean {
  // Same reference or both null/undefined
  if (a === b) return true;

  // One is null/undefined and the other isn't
  if (a == null || b == null) return false;

  // Date comparison helper
  const isDate = (val: unknown): val is Date =>
    val instanceof Date ||
    (typeof val === 'object' &&
      val !== null &&
      Object.prototype.toString.call(val) === '[object Date]');

  // If either is a Date or a string that looks like a Date
  const isDateLike = (val: unknown): boolean => {
    if (isDate(val)) return true;
    if (typeof val === 'string') {
      const parsed = Date.parse(val);
      return !isNaN(parsed) && val.includes('-');
    }
    return false;
  };

  if (isDateLike(a) || isDateLike(b)) {
    try {
      const t1 = new Date(a as string | number | Date).getTime();
      const t2 = new Date(b as string | number | Date).getTime();
      if (!isNaN(t1) && !isNaN(t2)) return t1 === t2;
    } catch {
      // Fallback
    }
  }

  // Different types
  if (typeof a !== typeof b) return false;

  // For primitives, === already checked above
  if (typeof a !== 'object') return a === b;

  // Arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((val, index) => isEqual(val, b[index]));
  }

  // One is array, other is not
  if (Array.isArray(a) || Array.isArray(b)) return false;

  // Objects
  const aObj = a as Record<string, unknown>;
  const bObj = b as Record<string, unknown>;

  const aKeys = Object.keys(aObj);
  const bKeys = Object.keys(bObj);

  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every(key => isEqual(aObj[key], bObj[key]));
}

/**
 * Maps all properties of a deleted/archived document to an array of ActivityLogChange.
 * All properties are listed in `oldValue`, and `newValue` is set to `null` to denote they no longer exist.
 *
 * @param {Record<string, unknown>} doc - The document object
 * @param {string[]} [excludeFields] - Additional fields to exclude (e.g. passwords, salts)
 * @returns {ActivityLogChange[]} Array of changes
 */
export function mapDeletedFieldsToChanges(
  doc: Record<string, unknown>,
  excludeFields: string[] = []
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  if (!doc || typeof doc !== 'object') {
    return [];
  }

  // Handle mongoose document to object conversion if needed
  const hasToObject =
    doc && typeof (doc as Record<string, unknown>).toObject === 'function';
  const rawObj = hasToObject
    ? (doc as unknown as { toObject: () => Record<string, unknown> }).toObject()
    : doc;

  const standardExclude = [
    '_id',
    '__v',
    'createdAt',
    'updatedAt',
    'deletedAt',
    'passwordHash',
    'passwordSalt',
    'totpSecret',
    'otpSecret',
    'pin',
  ];
  const allExclude = new Set([...standardExclude, ...excludeFields]);

  const changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }> = [];

  for (const [key, val] of Object.entries(rawObj)) {
    if (allExclude.has(key)) {
      continue;
    }

    let stringVal: unknown = val;
    if (val instanceof Date) {
      stringVal = val.toISOString();
    } else if (Array.isArray(val)) {
      stringVal = val.join(', ');
    } else if (typeof val === 'object' && val !== null) {
      stringVal = JSON.stringify(val);
    } else if (val === null || val === undefined) {
      stringVal = '';
    }

    changes.push({
      field: key,
      oldValue: stringVal,
      newValue: null,
    });
  }

  return changes;
}

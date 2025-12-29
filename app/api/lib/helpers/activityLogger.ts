import mongoose from 'mongoose';
import { ActivityLog } from '../models/activityLog';
import type { ActivityLogChange } from '../types/activityLog';

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
}): Promise<void> {
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
    // For auth failures (login attempts), 'unknown' is acceptable
    const userId = params.userId;
    const username = params.username;

    if (!userId || !username) {
      console.error('❌ Activity logging failed: Missing user information');
      console.error('❌ userId:', userId, 'username:', username);
      console.error('❌ Action:', params.action);
      throw new Error('User information is required for activity logging');
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
      // Optional fields
      details: params.details,
      ipAddress: params.ipAddress || 'unknown',
      userAgent: params.userAgent || 'unknown',
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
  } catch (error) {
    console.error('❌ Failed to log activity:', error);
    // Re-throw the error to ensure the calling code knows logging failed
    throw error;
  }
}

/**
 * Calculates changes between two objects.
 * Only compares fields that exist in the newObj (update payload).
 * This prevents logging all fields as changed when only specific fields are updated.
 *
 * @param oldObj - The original object
 * @param newObj - The updated object (should only contain fields being updated)
 * @returns Array of changes
 */
export function calculateChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): ActivityLogChange[] {
  const changes: ActivityLogChange[] = [];

  // Only check fields that are present in newObj (the update payload)
  for (const [key, newValue] of Object.entries(newObj)) {
    const oldValue = oldObj[key];

    // Deep comparison for objects and arrays
    const hasChanged = !isEqual(oldValue, newValue);

    if (hasChanged) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }

  // NOTE: We don't check for "deleted fields" in update operations
  // because the newObj only contains fields being updated, not a full document

  return changes;
}

/**
 * Deep equality check for comparing values
 */
function isEqual(a: unknown, b: unknown): boolean {
  // Same reference or both null/undefined
  if (a === b) return true;

  // One is null/undefined and the other isn't
  if (a == null || b == null) return false;

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


import mongoose from 'mongoose';
import { ActivityLog } from '../models/activityLog';
import type {
  ActivityLogActor,
  ActivityLogChange,
  ActivityLogEntity,
  ActivityLogQueryParams,
  ActivityLog as ActivityLogType,
} from '../types/activityLog';

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
 * Logs an activity to the database (original function for complex activities).
 *
 * @param actor - The user performing the action
 * @param actionType - The type of action (CREATE, UPDATE, DELETE, etc.)
 * @param entityType - The type of entity being acted upon (User, Licensee, etc.)
 * @param entity - The entity being acted upon
 * @param changes - Optional array of changes made
 * @param description - Optional description of the action
 * @param ipAddress - Optional IP address of the actor
 * @returns Promise resolving to the created activity log
 */
export async function logDetailedActivity(
  actor: ActivityLogActor,
  actionType: string,
  entityType: string,
  entity: ActivityLogEntity,
  changes?: ActivityLogChange[],
  description?: string,
  ipAddress?: string
): Promise<ActivityLogType> {
  // Generate description if not provided
  const finalDescription =
    description ||
    generateDescription(
      actionType,
      entityType,
      entity.name,
      actor.email,
      changes
    );

  const normalizedAction = actionType.toLowerCase();
  const normalizedResource = entityType.toLowerCase();

  const activityLog = await ActivityLog.create({
    // Required _id field
    _id: new mongoose.Types.ObjectId().toString(),
    // New required fields
    userId: actor.id,
    username: actor.email,
    action: normalizedAction,
    resource: normalizedResource,
    resourceId: entity.id,
    resourceName: entity.name,
    // Details
    details: finalDescription,
    previousData: undefined,
    newData: undefined,
    ipAddress,
    userAgent: undefined,
    timestamp: new Date(),
    // Legacy fields for backward compatibility
    actor,
    actionType: actionType.toUpperCase(),
    entityType,
    entity,
    changes: changes || [],
    description: finalDescription,
  });

  return activityLog.toObject();
}

/**
 * Retrieves activity logs based on query parameters.
 *
 * @param params - Query parameters for filtering
 * @returns Promise resolving to activity logs and total count
 */
export async function getActivityLogs(params: ActivityLogQueryParams): Promise<{
  data: ActivityLogType[];
  total: number;
}> {
  const {
    entityType,
    actionType,
    actorId,
    startDate,
    endDate,
    limit = '20',
    skip = '0',
  } = params;

  // Build query
  const query: Record<string, unknown> = {};

  if (entityType) {
    query.entityType = entityType;
  }

  if (actionType) {
    query.actionType = actionType.toUpperCase();
  }

  if (actorId) {
    query['actor.id'] = actorId;
  }

  if (startDate || endDate) {
    const timestampQuery: Record<string, Date> = {};
    if (startDate) {
      timestampQuery.$gte = new Date(startDate);
    }
    if (endDate) {
      timestampQuery.$lte = new Date(endDate);
    }
    query.timestamp = timestampQuery;
  }

  // Execute queries
  const [data, total] = await Promise.all([
    ActivityLog.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .lean(),
    ActivityLog.countDocuments(query),
  ]);

  return {
    data: data as unknown as ActivityLogType[],
    total,
  };
}

/**
 * Calculates changes between two objects.
 *
 * @param oldObj - The original object
 * @param newObj - The updated object
 * @returns Array of changes
 */
export function calculateChanges(
  oldObj: Record<string, unknown>,
  newObj: Record<string, unknown>
): ActivityLogChange[] {
  const changes: ActivityLogChange[] = [];

  // Check for changed or new fields
  for (const [key, newValue] of Object.entries(newObj)) {
    const oldValue = oldObj[key];
    if (oldValue !== newValue) {
      changes.push({
        field: key,
        oldValue,
        newValue,
      });
    }
  }

  // Check for deleted fields
  for (const [key, oldValue] of Object.entries(oldObj)) {
    if (!(key in newObj)) {
      changes.push({
        field: key,
        oldValue,
        newValue: undefined,
      });
    }
  }

  return changes;
}

/**
 * Generates a human-readable description for an activity log.
 *
 * @param actionType - The type of action
 * @param entityType - The type of entity
 * @param entityName - The name of the entity
 * @param actorEmail - The email of the actor
 * @param changes - Optional changes made
 * @returns Human-readable description
 */
export function generateDescription(
  actionType: string,
  entityType: string,
  entityName: string,
  actorEmail: string,
  changes?: ActivityLogChange[]
): string {
  const action = actionType.toLowerCase();
  const entity = entityType.toLowerCase();

  // Custom: If payment status was changed, call it out specifically
  if (changes && changes.length > 0) {
    const paymentChange = changes.find(c => c.field === 'isPaid');
    if (paymentChange) {
      const oldStatus = paymentChange.oldValue ? 'Paid' : 'Unpaid';
      const newStatus = paymentChange.newValue ? 'Paid' : 'Unpaid';
      const paymentDescription = `${actorEmail} updated the payment status for ${entity} "${entityName}" from "${oldStatus}" to "${newStatus}"`;
      return paymentDescription;
    }
    // Otherwise, default to the first field changed
    const change = changes[0];
    const defaultDescription = `${actorEmail} changed the ${change.field} of ${entity} "${entityName}" from "${change.oldValue}" to "${change.newValue}"`;
    return defaultDescription;
  }

  let fallbackDescription: string;
  switch (action) {
    case 'create':
      fallbackDescription = `${actorEmail} created a new ${entity} "${entityName}"`;
      break;
    case 'delete':
      fallbackDescription = `${actorEmail} deleted the ${entity} "${entityName}"`;
      break;
    case 'update':
    case 'edit':
      fallbackDescription = `${actorEmail} updated the ${entity} "${entityName}"`;
      break;
    default:
      fallbackDescription = `${actorEmail} performed ${action} action on ${entity} "${entityName}"`;
  }

  return fallbackDescription;
}

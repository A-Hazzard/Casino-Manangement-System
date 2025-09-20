import mongoose from "mongoose";
import { ActivityLog } from "@/app/api/lib/models/activityLog";
import type {
  ActivityLog as ActivityLogType,
  ActivityLogActor,
  ActivityLogEntity,
  ActivityLogChange,
  ActivityLogQueryParams,
} from "../types/activityLog";

/**
 * Logs an activity to the database.
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
export async function logActivity(
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
    limit = "20",
    skip = "0",
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
    query["actor.id"] = actorId;
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
    const paymentChange = changes.find((c) => c.field === "isPaid");
    if (paymentChange) {
      const oldStatus = paymentChange.oldValue ? "Paid" : "Unpaid";
      const newStatus = paymentChange.newValue ? "Paid" : "Unpaid";
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
    case "create":
      fallbackDescription = `${actorEmail} created a new ${entity} "${entityName}"`;
      break;
    case "delete":
      fallbackDescription = `${actorEmail} deleted the ${entity} "${entityName}"`;
      break;
    case "update":
    case "edit":
      fallbackDescription = `${actorEmail} updated the ${entity} "${entityName}"`;
      break;
    default:
      fallbackDescription = `${actorEmail} performed ${action} action on ${entity} "${entityName}"`;
  }

  return fallbackDescription;
}

/**
 * Creates an activity logger function for a specific actor.
 * This is a higher-order function that returns a logger bound to a specific user.
 *
 * @param actor - The user performing the actions
 * @returns A function that can be used to log activities
 */
export function createActivityLogger(actor: ActivityLogActor) {
  return async function logActivityForActor(
    actionType: string,
    entityType: string,
    entity: ActivityLogEntity,
    changes?: ActivityLogChange[],
    description?: string,
    ipAddress?: string
  ): Promise<ActivityLogType> {
    return logActivity(actor, actionType, entityType, entity, changes, description, ipAddress);
  };
}

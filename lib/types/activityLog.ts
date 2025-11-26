/**
 * Activity Log Types
 * Types for activity logging system including actors, entities, and changes.
 *
 * Supports both new and legacy activity log formats for backward compatibility.
 * Used for tracking user actions, resource changes, and audit trails.
 */
export type ActivityLogActor = {
  id: string;
  email: string;
  role: string;
};

export type ActivityLogEntity = {
  id: string;
  name: string;
};

export type ActivityLogChange = {
  field: string;
  oldValue: unknown;
  newValue: unknown;
};

export type ActivityLog = {
  _id?: string;
  timestamp: Date;
  // New fields
  userId?: string;
  username?: string;
  action?: string;
  resource?: string;
  resourceId?: string;
  resourceName?: string;
  details?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  userAgent?: string;
  // Legacy fields for backward compatibility
  actor?: ActivityLogActor;
  actionType?: string;
  entityType?: string;
  entity?: ActivityLogEntity;
  changes?: ActivityLogChange[];
  description?: string;
  ipAddress?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ActivityLogQueryParams = {
  entityType?: string;
  actionType?: string;
  actorId?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  skip?: string;
};

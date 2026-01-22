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



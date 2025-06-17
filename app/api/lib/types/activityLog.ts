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
  actor: ActivityLogActor;
  actionType: string;
  entityType: string;
  entity: ActivityLogEntity;
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

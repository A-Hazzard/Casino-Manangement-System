import { model, models, Schema } from 'mongoose';

const ActivityLogSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    timestamp: { type: Date, default: Date.now, required: true },

    userId: { type: String, required: true },
    username: { type: String, required: true },

    action: {
      type: String,
      required: true,
      enum: [
        'create',
        'update',
        'delete',
        'restore',
        'archive',
        'view',
        'download',
        'login_success',
        'login_failed',
        'login_blocked',
        'login_error',
        'logout',
        'password_reset',
        'account_locked',
        'account_unlocked',
        'cancel',
        'sms_success',
        'sms_failed',
      ],
    },
    resource: {
      type: String,
      required: true,
      enum: [
        'user',
        'licencee',
        'member',
        'location',
        'machine',
        'cabinet',
        'session',
        'collection',
        'firmware',
        'auth',
        'feedback',
        'collection-report',
        'report',
        'system',
        'vault',
        'cashier_shift',
        'smib',
        'movement_request',
        'sms',
      ],
    },
    resourceId: { type: String, required: true },
    resourceName: { type: String },
    membershipLog: { type: Boolean, default: false },

    details: { type: String },
    previousData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },

    ipAddress: { type: String },
    userAgent: { type: String },

    actor: {
      id: { type: String },
      email: { type: String },
      role: { type: String },
    },
    actionType: { type: String },
    entityType: { type: String },
    entity: {
      id: { type: String },
      name: { type: String },
    },
    changes: {
      type: [
        {
          field: { type: String, required: true },
          oldValue: { type: Schema.Types.Mixed },
          newValue: { type: Schema.Types.Mixed },
        },
      ],
      default: [],
      required: true,
    },
    description: { type: String },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ resource: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });
ActivityLogSchema.index({ resourceId: 1, timestamp: -1 });
ActivityLogSchema.index({ ipAddress: 1, timestamp: -1 });

ActivityLogSchema.index({ entityType: 1, timestamp: -1 });
ActivityLogSchema.index({ 'actor.id': 1, timestamp: -1 });
ActivityLogSchema.index({ actionType: 1, timestamp: -1 });

if (process.env.NODE_ENV === 'development' && models?.ActivityLog) {
  delete models.ActivityLog;
}

export const ActivityLog =
  models?.ActivityLog ||
  model('ActivityLog', ActivityLogSchema, 'activityLogs');

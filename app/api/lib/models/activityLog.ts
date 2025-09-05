import { model, models, Schema } from "mongoose";

const ActivityLogSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    timestamp: { type: Date, default: Date.now, required: true },
    // User who performed the action
    userId: { type: String, required: true },
    username: { type: String, required: true },
    // Action details
    action: {
      type: String,
      required: true,
      enum: ["create", "update", "delete", "view"],
    },
    resource: {
      type: String,
      required: true,
      enum: ["user", "licensee", "member", "location", "machine", "session"],
    },
    resourceId: { type: String, required: true },
    resourceName: { type: String },
    // Detailed information
    details: { type: String },
    previousData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
    // Client information
    ipAddress: { type: String },
    userAgent: { type: String },
    // Legacy fields for backward compatibility
    actor: {
      id: { type: String },
      email: { type: String },
      role: { type: String },
    },
    actionType: { type: String }, // CREATE, UPDATE, DELETE, etc.
    entityType: { type: String }, // User, Licensee, etc.
    entity: {
      id: { type: String },
      name: { type: String },
    },
    changes: [
      {
        field: { type: String },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
      },
    ],
    description: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Add indexes for better query performance
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ resource: 1, timestamp: -1 });
ActivityLogSchema.index({ userId: 1, timestamp: -1 });
ActivityLogSchema.index({ action: 1, timestamp: -1 });
ActivityLogSchema.index({ resourceId: 1, timestamp: -1 });
ActivityLogSchema.index({ ipAddress: 1, timestamp: -1 }); // Index for IP address queries
// Legacy indexes for backward compatibility
ActivityLogSchema.index({ entityType: 1, timestamp: -1 });
ActivityLogSchema.index({ "actor.id": 1, timestamp: -1 });
ActivityLogSchema.index({ actionType: 1, timestamp: -1 });

export const ActivityLog =
  models.ActivityLog || model("ActivityLog", ActivityLogSchema, "activityLogs");

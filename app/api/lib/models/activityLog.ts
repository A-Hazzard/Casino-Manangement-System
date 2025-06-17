import { model, models, Schema } from "mongoose";

const ActivityLogSchema = new Schema(
  {
    timestamp: { type: Date, default: Date.now, required: true },
    actor: {
      id: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, required: true },
    },
    actionType: { type: String, required: true }, // CREATE, UPDATE, DELETE, etc.
    entityType: { type: String, required: true }, // User, Licensee, etc.
    entity: {
      id: { type: String, required: true },
      name: { type: String, required: true },
    },
    changes: [
      {
        field: { type: String, required: true },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
      },
    ],
    description: { type: String },
    ipAddress: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Add indexes for better query performance
ActivityLogSchema.index({ timestamp: -1 });
ActivityLogSchema.index({ entityType: 1, timestamp: -1 });
ActivityLogSchema.index({ "actor.id": 1, timestamp: -1 });
ActivityLogSchema.index({ actionType: 1, timestamp: -1 });

export const ActivityLog =
  models.ActivityLog || model("ActivityLog", ActivityLogSchema, "activityLogs");

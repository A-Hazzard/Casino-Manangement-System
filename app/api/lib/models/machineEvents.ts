import { model, models, Schema } from "mongoose";

const machineEventSchema = new Schema(
  {
    _id: { type: String },
    sequence: [
      {
        message: {
          typ: { type: String },
          rly: { type: String },
          mac: { type: String },
          tkn: { type: String },
          pyd: { type: String },
        },
        description: { type: String },
        logLevel: { type: String },
        success: { type: Boolean },
        createdAt: { type: Date },
      },
    ],
    stateId: { type: String },
    machine: { type: String, required: true },
    location: { type: String },
    relay: { type: String },
    currentSession: { type: String },
    description: { type: String },
    cabinetId: { type: String },
    gameName: { type: String },
    command: { type: String },
    eventType: { type: String },
    eventLogLevel: { type: String },
    eventSuccess: { type: Boolean },
    date: { type: Date },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for better query performance
machineEventSchema.index({ machine: 1, date: -1 }); // For machine-based queries
machineEventSchema.index({ location: 1, date: -1 }); // For location-based queries
machineEventSchema.index({ date: -1 }); // For date-based queries

/**
 * Mongoose model for machine events, including message, machine, relay, command, and timestamps.
 */
export const MachineEvent =
  models.machineevents || model("machineevents", machineEventSchema);

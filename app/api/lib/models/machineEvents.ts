import { model, models, Schema } from 'mongoose';

const machineEventSchema = new Schema(
  {
    _id: { type: String },
    // Old system: single message object
    message: {
      incomingMessage: {
        typ: { type: String },
        rly: { type: String },
        mac: { type: String },
        pyd: { type: String },
      },
      serialNumber: { type: String },
      game: { type: String },
      gamingLocation: { type: String },
    },
    // New system: sequence of messages/events
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
    // Old system: commandType field
    commandType: { type: String },
    // Old system: date can be an object, but we store as Date
    date: { type: Date },
    // Old system: __v (Mongoose version key)
    __v: { type: Number },
    // Timestamps
    createdAt: { type: Date },
    updatedAt: { type: Date },
    // New system fields
    eventType: { type: String },
    eventLogLevel: { type: String },
    eventSuccess: { type: Boolean },
  },
  { timestamps: true }
);

// Indexes for better query performance
machineEventSchema.index({ machine: 1, date: -1 }); // For machine-based queries
machineEventSchema.index({ location: 1, date: -1 }); // For location-based queries
machineEventSchema.index({ date: -1 }); // For date-based queries

/**
 * Mongoose model for machine events, supporting both legacy and new schema fields.
 */
export const MachineEvent =
  models.machineevents || model('machineevents', machineEventSchema);


import { model, models, Schema } from "mongoose";

const machineEventSchema = new Schema(
  {
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
    machine: { type: String, required: true },
    relay: { type: String },
    commandType: { type: String },
    command: { type: String },
    description: { type: String },
    date: { type: Date },
    cabinetId: { type: String },
    gameName: { type: String },
    location: { type: String },
  },
  { timestamps: true }
);

/**
 * Mongoose model for machine events, including message, machine, relay, command, and timestamps.
 */
export const MachineEvent =
  models.machineevents || model("machineevents", machineEventSchema);

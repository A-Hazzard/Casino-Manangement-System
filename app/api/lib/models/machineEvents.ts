import { model, models, Schema } from 'mongoose';

const machineEventSchema = new Schema(
  {
    _id: { type: String },

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

    commandType: { type: String },

    date: { type: Date },

    __v: { type: Number },

    createdAt: { type: Date },
    updatedAt: { type: Date },

    eventType: { type: String },
    eventLogLevel: { type: String },
    eventSuccess: { type: Boolean },
  },
  { timestamps: true }
);

machineEventSchema.index({ machine: 1, date: -1 });
machineEventSchema.index({ location: 1, date: -1 });
machineEventSchema.index({ date: -1 });

export const MachineEvent =
  models.machineevents || model('machineevents', machineEventSchema);

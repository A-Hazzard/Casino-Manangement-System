import mongoose, { Schema } from 'mongoose';

export type ReportedMachineStatus =
  | 'pending'
  | 'captured'
  | 'confirmed'
  | 'skipped';
export type SessionStatus = 'in-progress' | 'submitted';

export type ReportedMachineDocument = {
  _id: string;
  sessionId: string;
  sessionStatus: SessionStatus;
  locationId: string;
  locationName: string;
  licencee: string;
  machineId: string;
  machineName: string;
  machineCustomName: string;
  serialNumber: string;
  manufacturer: string;
  game?: string;
  collector: string;
  collectorName: string;
  systemMetersIn: number;
  systemMetersOut: number;
  sasStartTime?: Date;
  sasEndTime?: Date;
  imageFileId?: string;
  imageName?: string;
  imageSize?: number;
  imageData?: string;
  imageCapturedAt?: Date;
  metersMatch?: boolean;
  sequenceOrder: number;
  status: ReportedMachineStatus;
  createdAt: Date;
  updatedAt: Date;
};

const reportedMachineSchema = new Schema<ReportedMachineDocument>(
  {
    _id: { type: String },
    sessionId: { type: String, required: true },
    sessionStatus: {
      type: String,
      enum: ['in-progress', 'submitted'],
      default: 'in-progress',
    },
    locationId: { type: String, required: true },
    locationName: { type: String, required: true },
    licencee: { type: String },
    machineId: { type: String, required: true },
    machineName: { type: String },
    machineCustomName: { type: String },
    serialNumber: { type: String },
    manufacturer: { type: String },
    game: { type: String },
    collector: { type: String, required: true },
    collectorName: { type: String },
    systemMetersIn: { type: Number, default: 0 },
    systemMetersOut: { type: Number, default: 0 },
    sasStartTime: { type: Date },
    sasEndTime: { type: Date },
    imageFileId: { type: String },
    imageName: { type: String },
    imageSize: { type: Number },
    imageData: { type: String },
    imageCapturedAt: { type: Date },
    metersMatch: { type: Boolean },
    sequenceOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'captured', 'confirmed', 'skipped'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

reportedMachineSchema.index({ sessionId: 1 });
reportedMachineSchema.index({ sessionId: 1, machineId: 1 });
reportedMachineSchema.index({ licencee: 1, createdAt: -1 });
reportedMachineSchema.index({ locationId: 1, createdAt: -1 });

export const ReportedMachine =
  (mongoose.models
    ?.ReportedMachine as mongoose.Model<ReportedMachineDocument>) ||
  mongoose.model<ReportedMachineDocument>(
    'ReportedMachine',
    reportedMachineSchema
  );

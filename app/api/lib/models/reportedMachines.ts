import mongoose, { Schema } from 'mongoose';

export type ReportedMachineStatus =
  | 'pending'
  | 'captured'
  | 'confirmed'
  | 'skipped';
export type SessionStatus = 'in-progress' | 'submitted';

/**
 * Movement deltas for manual meters only.
 *
 * SAS/system values are stored at the top level of ReportedMachineDocument
 * (sasMetersIn, sasMetersOut, sasGross) — NOT inside movement.
 *
 * movement.manualMetersIn  = currentManualIn  - prevSasMetersIn
 * movement.manualMetersOut = currentManualOut - prevSasMetersOut
 * movement.machineGross    = movement.manualMetersIn - movement.manualMetersOut
 */
export type ReportedMachineMovement = {
  manualMetersIn?: number;
  manualMetersOut?: number;
  machineGross?: number;
};

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
  // SAS/system lifetime meter readings captured from the machine
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  // SAS gross — computed via time-range Meters aggregation (metersMatch true)
  // or simply sasMetersIn - sasMetersOut (metersMatch false)
  sasGross?: number | null;
  // Manual meter readings entered by the collector (only when metersMatch === false)
  manualMetersIn?: number | null;
  manualMetersOut?: number | null;
  // Previous SAS meter readings (from the last submitted session or Machine.collectionMeters)
  prevSasMetersIn?: number;
  prevSasMetersOut?: number;
  // Calculated movement deltas (current - previous), manual meters only
  movement?: ReportedMachineMovement;
  // RAM clear — when true, the machine's meters were reset between collections.
  // ramClearMetersIn/Out hold the pre-reset peak readings; sasMetersIn/Out (or
  // manualMetersIn/Out for no-SMIB) hold the post-reset readings starting from 0.
  ramClear?: boolean;
  ramClearMetersIn?: number;
  ramClearMetersOut?: number;
  isSupplemental?: boolean;
  sessionStartTime?: Date;
  sessionEndTime?: Date;
  sasStartTime?: Date;
  sasEndTime?: Date;
  driveFileId?: string | null;
  driveFolderId?: string | null;
  imageCapturedAt?: Date;
  tempImageData?: string;
  metersMatch?: boolean;
  deletedAt?: Date | null;
  sequenceOrder: number;
  status: ReportedMachineStatus;
  notes?: string;
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
    sasMetersIn: { type: Number, default: null },
    sasMetersOut: { type: Number, default: null },
    sasGross: { type: Number, default: null },
    manualMetersIn: { type: Number },
    manualMetersOut: { type: Number },
    prevSasMetersIn: { type: Number },
    prevSasMetersOut: { type: Number },
    movement: {
      type: new Schema(
        {
          manualMetersIn: { type: Number },
          manualMetersOut: { type: Number },
          machineGross: { type: Number },
        },
        { _id: false }
      ),
    },
    ramClear: { type: Boolean, default: false },
    ramClearMetersIn: { type: Number },
    ramClearMetersOut: { type: Number },
    isSupplemental: { type: Boolean, default: false },
    sessionStartTime: { type: Date },
    sessionEndTime: { type: Date },
    sasStartTime: { type: Date },
    sasEndTime: { type: Date },
    driveFileId: { type: String },
    driveFolderId: { type: String },
    imageCapturedAt: { type: Date },
    tempImageData: { type: String },
    metersMatch: { type: Boolean },
    deletedAt: { type: Date, default: null },
    sequenceOrder: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'captured', 'confirmed', 'skipped'],
      default: 'pending',
    },
    notes: { type: String },
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

import mongoose, { Schema } from "mongoose";
import type { CollectionDocument } from "@/lib/types/collections";

const sasMetersSchema = new Schema(
  {
    machine: { type: String },
    drop: { type: Number },
    totalCancelledCredits: { type: Number },
    gross: { type: Number },
    gamesPlayed: { type: Number },
    jackpot: { type: Number },
    sasStartTime: { type: String },
    sasEndTime: { type: String },
  },
  { _id: false }
);

const movementSchema = new Schema(
  {
    metersIn: { type: Number },
    metersOut: { type: Number },
    gross: { type: Number },
  },
  { _id: false }
);

const collectionsSchema = new Schema(
  {
    _id: { type: String },
    isCompleted: { type: Boolean },
    metersIn: { type: Number },
    metersOut: { type: Number },
    prevIn: { type: Number },
    prevOut: { type: Number },
    softMetersIn: { type: Number },
    softMetersOut: { type: Number },
    notes: { type: String },
    timestamp: { type: Date },
    location: { type: String },
    collector: { type: String },
    locationReportId: { type: String },
    sasMeters: sasMetersSchema,
    movement: movementSchema,
    machineCustomName: { type: String },
    machineId: { type: String },
    machineName: { type: String },
    ramClear: { type: Boolean },
    serialNumber: { type: String },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    __v: { type: Number },
  },
  { timestamps: true }
);

export const Collections =
  (mongoose.models?.Collections as mongoose.Model<CollectionDocument>) ||
  mongoose.model<CollectionDocument>("Collections", collectionsSchema);

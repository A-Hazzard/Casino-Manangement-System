import { Schema, model, models } from "mongoose";

const MetersSchema = new Schema(
  {
    machine: { type: String, required: true },
    location: { type: String, required: true },
    movement: {
      coinIn: { type: Number, default: 0 },
      coinOut: { type: Number, default: 0 },
      totalCancelledCredits: { type: Number, default: 0 },
      totalHandPaidCancelledCredits: { type: Number, default: 0 },
      totalWonCredits: { type: Number, default: 0 },
      drop: { type: Number, default: 0 },
      jackpot: { type: Number, default: 0 },
      currentCredits: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
      gamesWon: { type: Number, default: 0 },
      metersIn: { type: Number, default: 0 },
      metersOut: { type: Number, default: 0 },
      billIn: { type: Number, default: 0 },
      voucherOut: { type: Number, default: 0 },
      attPaidCredits: { type: Number, default: 0 },
    },
    createdAt: { type: Date, default: Date.now },
    readAt: { type: Date, default: Date.now },
    machineId: { type: String },
  },
  { timestamps: true, versionKey: false }
);

// Critical indexes for aggregation performance
MetersSchema.index({ location: 1, readAt: 1 }); // For location-based queries with date filtering
MetersSchema.index({ machine: 1, readAt: 1 }); // For machine-based queries
MetersSchema.index({ readAt: 1 }); // For date range queries
MetersSchema.index({ location: 1, machine: 1 }); // For location-machine combinations

/**
 * Mongoose model for meter readings, including references to machines and locations, and all meter fields.
 * Exported as 'Meters' for use in API routes and data access layers.
 */
export const Meters = models.Meters || model("Meters", MetersSchema);

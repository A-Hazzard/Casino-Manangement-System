import { Schema, model, models } from 'mongoose';

const MetersSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    machine: { type: String, required: true },
    location: { type: String, required: true },
       viewingAccountDenomination: {
      // Added based on example
      drop: { type: Number, default: 0 },
      totalCancelledCredits: { type: Number, default: 0 },
    },
    locationSession: { type: String },
    movement: {
      // Updated based on example, removed extra fields
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
    },
    // These fields are now at the top level, as per the example
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
    isSasCreated: { type: Boolean },
    isRamClear: { type: Boolean },
    readAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false }
);

// Critical indexes for aggregation performance (kept as they are still relevant)
MetersSchema.index({ location: 1, readAt: 1 }); // For location-based queries with date filtering
MetersSchema.index({ machine: 1, readAt: 1 }); // For machine-based queries
MetersSchema.index({ readAt: 1 }); // For date range queries
MetersSchema.index({ location: 1, machine: 1 }); // For location-machine combinations
MetersSchema.index({ locationSession: 1, readAt: 1 }); // Added index for new field

/**
 * Mongoose model for meter readings, including references to machines and locations, and all meter fields.
 * Exported as 'Meters' for use in API routes and data access layers.
 */
export const Meters = models['meters'] || model('meters', MetersSchema);


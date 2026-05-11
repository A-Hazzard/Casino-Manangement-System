import { Schema, model, models } from 'mongoose';

const MetersSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    machine: { type: String, required: true },
    location: { type: String, required: true },
    locationSession: { type: String },
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
    },
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
    meterSource: {
      type: String,
      enum: ['COLLECTION_REPORT', 'SAS_READ', 'OTHER'],
      default: 'COLLECTION_REPORT',
    },
    isRamClear: { type: Boolean },
    readAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false }
);

MetersSchema.index({ location: 1, readAt: 1 });
MetersSchema.index({ machine: 1, readAt: 1 });
MetersSchema.index({ readAt: 1 });
MetersSchema.index({ location: 1, machine: 1 });
MetersSchema.index({ locationSession: 1, readAt: 1 });

export const Meters = models['meters'] || model('meters', MetersSchema);

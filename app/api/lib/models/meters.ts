import { Schema, model, models, Query, Aggregate } from 'mongoose';

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
    isSupplemental: { type: Boolean, default: false },
    readAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now },
    deletedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);

MetersSchema.index({ location: 1, readAt: 1 });
MetersSchema.index({ machine: 1, readAt: 1 });
MetersSchema.index({ readAt: 1 });
MetersSchema.index({ location: 1, machine: 1 });
MetersSchema.index({ locationSession: 1, readAt: 1 });

MetersSchema.pre(
  'find',
  function (this: Query<unknown, unknown>, next: () => void) {
    this.where({
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2026-01-01') } },
      ],
    });
    next();
  }
);

MetersSchema.pre(
  'findOne',
  function (this: Query<unknown, unknown>, next: () => void) {
    this.where({
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2026-01-01') } },
      ],
    });
    next();
  }
);

MetersSchema.pre(
  'countDocuments',
  function (this: Query<unknown, unknown>, next: () => void) {
    this.where({
      $or: [
        { deletedAt: null },
        { deletedAt: { $exists: false } },
        { deletedAt: { $lt: new Date('2026-01-01') } },
      ],
    });
    next();
  }
);

MetersSchema.pre(
  'aggregate',
  function (this: Aggregate<unknown>, next: () => void) {
    this.pipeline().unshift({
      $match: {
        $or: [
          { deletedAt: null },
          { deletedAt: { $exists: false } },
          { deletedAt: { $lt: new Date('2026-01-01') } },
        ],
      },
    });
    next();
  }
);

export const Meters = models['meters'] || model('meters', MetersSchema);

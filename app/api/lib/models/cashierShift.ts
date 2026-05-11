import mongoose, { model, Schema } from 'mongoose';

const DenominationSchema = new Schema(
  {
    denomination: {
      type: Number,
      required: true,
      enum: [1, 2, 5, 10, 20, 50, 100, 500, 1000, 5000],
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const CashierShiftSchema = new Schema(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true, index: true },
    cashierId: { type: String, required: true, index: true },
    vaultShiftId: { type: String, required: true },

    status: {
      type: String,
      enum: [
        'pending_start',
        'active',
        'closed',
        'pending_review',
        'cancelled',
      ],
      default: 'pending_start',
      required: true,
    },

    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date },

    openingBalance: { type: Number, required: true, min: 0 },
    openingDenominations: [DenominationSchema],

    cashierEnteredBalance: { type: Number, min: 0 },
    cashierEnteredDenominations: [DenominationSchema],
    expectedClosingBalance: { type: Number, min: 0 },
    closingBalance: { type: Number, min: 0 },
    closingDenominations: [DenominationSchema],

    discrepancy: { type: Number },
    discrepancyResolved: { type: Boolean, default: false },
    vmReviewNotes: { type: String },
    vmAdjustedBalance: { type: Number },
    reviewedBy: { type: String },
    reviewedAt: { type: Date },

    currentBalance: { type: Number, required: true, default: 0 },
    lastSyncedDenominations: [DenominationSchema],

    payoutsTotal: { type: Number, default: 0, min: 0 },
    payoutsCount: { type: Number, default: 0, min: 0 },
    floatAdjustmentsTotal: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

CashierShiftSchema.index({ locationId: 1, status: 1 });
CashierShiftSchema.index({ cashierId: 1, createdAt: -1 });
CashierShiftSchema.index({ status: 1, closedAt: -1 });

const CashierShiftModel =
  mongoose.models?.cashierShifts || model('cashierShifts', CashierShiftSchema);

export default CashierShiftModel;

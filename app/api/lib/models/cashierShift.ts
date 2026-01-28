import mongoose, { model, Schema } from 'mongoose';

/**
 * Denomination Schema
 * Tracks specific bill denominations and quantities
 */
const DenominationSchema = new Schema(
  {
    denomination: {
      type: Number,
      required: true,
      enum: [1, 5, 10, 20, 50, 100],
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

/**
 * Cashier Shift Schema
 * Tracks individual cashier shifts with blind closing support (C-4)
 */
const CashierShiftSchema = new Schema(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true, index: true },
    cashierId: { type: String, required: true, index: true },
    vaultShiftId: { type: String, required: true }, // Parent vault shift

    status: {
      type: String,
      enum: ['pending_start', 'active', 'closed', 'pending_review'],
      default: 'pending_start',
      required: true,
    },

    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date },

    // Opening balance
    openingBalance: { type: Number, required: true, min: 0 },
    openingDenominations: [DenominationSchema],

    // Closing - Blind Close Implementation (C-4)
    cashierEnteredBalance: { type: Number, min: 0 }, // What cashier physically counted
    cashierEnteredDenominations: [DenominationSchema],
    expectedClosingBalance: { type: Number, min: 0 }, // System calculation
    closingBalance: { type: Number, min: 0 }, // Final approved balance
    closingDenominations: [DenominationSchema],

    // Discrepancy handling
    discrepancy: { type: Number }, // Difference between expected and entered
    discrepancyResolved: { type: Boolean, default: false },
    vmReviewNotes: { type: String },
    vmAdjustedBalance: { type: Number },
    reviewedBy: { type: String }, // VM user ID
    reviewedAt: { type: Date },

    // Metrics
    payoutsTotal: { type: Number, default: 0, min: 0 },
    payoutsCount: { type: Number, default: 0, min: 0 },
    floatAdjustmentsTotal: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for performance
CashierShiftSchema.index({ locationId: 1, status: 1 });
CashierShiftSchema.index({ cashierId: 1, createdAt: -1 });
CashierShiftSchema.index({ status: 1, closedAt: -1 });

const CashierShiftModel =
  mongoose.models?.cashierShifts || model('cashierShifts', CashierShiftSchema);

export default CashierShiftModel;

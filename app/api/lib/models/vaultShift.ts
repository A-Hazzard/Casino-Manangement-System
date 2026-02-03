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
      enum: [1, 5, 10, 20, 50, 100], // Standard US denominations
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
 * Vault Shift Schema
 * Tracks vault manager shifts and vault balance state (VM-1)
 */
const VaultShiftSchema = new Schema(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true, index: true },
    vaultManagerId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['active', 'closed'],
      default: 'active',
      required: true,
    },
    openedAt: { type: Date, required: true, default: Date.now },
    closedAt: { type: Date },

    // Opening balance
    openingBalance: { type: Number, required: true, min: 0 },
    openingDenominations: [DenominationSchema],

    // Current running inventory
    currentDenominations: [DenominationSchema],

    // Closing balance
    closingBalance: { type: Number, min: 0 },
    closingDenominations: [DenominationSchema],

    // Reconciliations (VM-1)
    reconciliations: [
      {
        timestamp: { type: Date, required: true },
        previousBalance: { type: Number, required: true },
        newBalance: { type: Number, required: true },
        denominations: [DenominationSchema],
        reason: { type: String, required: true },
        comment: { type: String, required: true }, // Mandatory for audit
      },
    ],

    // BR-01: Cannot close if cashiers active/pending
    canClose: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for performance
VaultShiftSchema.index({ locationId: 1, status: 1 });
VaultShiftSchema.index({ vaultManagerId: 1, createdAt: -1 });

const VaultShiftModel =
  mongoose.models?.vaultShifts || model('vaultShifts', VaultShiftSchema);

export default VaultShiftModel;

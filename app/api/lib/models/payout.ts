import mongoose, { model, Schema } from 'mongoose';

/**
 * Payout Schema
 * Individual payout records for ticket redemption and hand pays (C-2)
 */
const PayoutSchema = new Schema(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true, index: true },
    cashierId: { type: String, required: true, index: true },
    cashierShiftId: { type: String, required: true },

    type: {
      type: String,
      enum: ['ticket', 'hand_pay'],
      required: true,
    },

    amount: { type: Number, required: true, min: 0 },

    // Ticket redemption (C-2.1)
    ticketNumber: { type: String },
    ticketBarcode: { type: String },

    // Hand pay (C-2.2)
    machineId: { type: String },
    machineName: { type: String },
    jackpotType: { type: String },

    // Validation
    validated: { type: Boolean, default: false },
    validationMethod: { type: String },

    // Audit trail
    timestamp: { type: Date, required: true, default: Date.now, index: true },
    cashierFloatBefore: { type: Number, required: true },
    cashierFloatAfter: { type: Number, required: true },

    // Transaction reference
    transactionId: { type: String, required: true }, // Link to vaultTransactions

    notes: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false } // Use createdAt only
);

// Indexes for performance
PayoutSchema.index({ locationId: 1, timestamp: -1 });
PayoutSchema.index({ cashierId: 1, timestamp: -1 });
PayoutSchema.index({ type: 1, timestamp: -1 });
PayoutSchema.index({ ticketNumber: 1 }, { sparse: true });
PayoutSchema.index({ machineId: 1, timestamp: -1 }, { sparse: true });

const PayoutModel = mongoose.models?.payouts || model('payouts', PayoutSchema);

export default PayoutModel;

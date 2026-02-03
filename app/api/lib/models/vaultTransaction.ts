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
 * Movement Source/Destination Schema
 */
const MovementEndpointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['vault', 'cashier', 'machine', 'external'],
      required: true,
    },
    id: { type: String }, // cashier ID, machine ID, etc.
  },
  { _id: false }
);

/**
 * Vault Transaction Schema
 * Immutable ledger of all cash movements (BR-03)
 * Technical Consideration: Transactional ledger for audit trail
 */
const VaultTransactionSchema = new Schema(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, default: Date.now, index: true },

    type: {
      type: String,
      enum: [
        'vault_open',
        'vault_close',
        'vault_reconciliation',
        'cashier_shift_open',
        'cashier_shift_close',
        'float_increase',
        'float_decrease',
        'payout',
        'machine_collection',
        'soft_count',
        'expense',
      ],
      required: true,
      index: true,
    },

    // Movement tracking
    from: { type: MovementEndpointSchema, required: true },
    to: { type: MovementEndpointSchema, required: true },

    amount: { type: Number, required: true },
    denominations: [DenominationSchema],

    // Balance tracking
    vaultBalanceBefore: { type: Number },
    vaultBalanceAfter: { type: Number },
    cashierBalanceBefore: { type: Number },
    cashierBalanceAfter: { type: Number },

    // References
    vaultShiftId: { type: String },
    cashierShiftId: { type: String },
    floatRequestId: { type: String },
    payoutId: { type: String },

    // Audit (BR-03)
    performedBy: { type: String, required: true }, // user ID
    notes: { type: String },
    auditComment: { type: String }, // Mandatory for reconciliations

    // Attachments
    attachmentId: { type: Schema.Types.ObjectId }, // GridFS file ID
    attachmentName: { type: String },


    // Immutability - transactions cannot be deleted, only voided
    isVoid: { type: Boolean, default: false },
    voidReason: { type: String },
    voidedBy: { type: String },
    voidedAt: { type: Date },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false } // Use createdAt only, no updates allowed
);

// Indexes for performance and querying
VaultTransactionSchema.index({ locationId: 1, timestamp: -1 });
VaultTransactionSchema.index({ type: 1, timestamp: -1 });
VaultTransactionSchema.index({ performedBy: 1, timestamp: -1 });
VaultTransactionSchema.index({ isVoid: 1 });

const VaultTransactionModel =
  mongoose.models?.vaultTransactions ||
  model('vaultTransactions', VaultTransactionSchema);

export default VaultTransactionModel;

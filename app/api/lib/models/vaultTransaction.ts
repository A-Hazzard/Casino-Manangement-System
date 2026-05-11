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

const MovementEndpointSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['vault', 'cashier', 'machine', 'external'],
      required: true,
    },
    id: { type: String },
  },
  { _id: false }
);

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
        'add_cash',
        'remove_cash',
      ],
      required: true,
      index: true,
    },

    from: { type: MovementEndpointSchema, required: true },
    to: { type: MovementEndpointSchema, required: true },
    fromName: { type: String },
    toName: { type: String },

    amount: { type: Number, required: true },
    denominations: [DenominationSchema],

    vaultBalanceBefore: { type: Number },
    vaultBalanceAfter: { type: Number },
    cashierBalanceBefore: { type: Number },
    cashierBalanceAfter: { type: Number },

    vaultShiftId: { type: String },
    cashierShiftId: { type: String },
    floatRequestId: { type: String },
    payoutId: { type: String },

    performedBy: { type: String, required: true },
    performedByName: { type: String },
    notes: { type: String },
    reason: { type: String },
    auditComment: { type: String },

    attachmentId: { type: Schema.Types.ObjectId },
    attachmentName: { type: String },

    bankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountType: { type: String },
      transit: { type: String },
      branch: { type: String },
      nameOnAccount: { type: String },
    },
    expenseDetails: {
      vendor: { type: String },
      invoiceNumber: { type: String },
      serviceProvider: { type: String },
      isMachineRepair: { type: Boolean },
      machineIds: [{ type: String }],
      machineDetails: [
        {
          identifier: { type: String },
          game: { type: String },
          gameType: { type: String },
        },
      ],
      billerName: { type: String },
      billingPeriod: { type: String },
      referenceNumber: { type: String },
      description: { type: String },
    },

    isVoid: { type: Boolean, default: false },
    voidReason: { type: String },
    voidedBy: { type: String },
    voidedAt: { type: Date },

    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

VaultTransactionSchema.index({ locationId: 1, timestamp: -1 });
VaultTransactionSchema.index({ type: 1, timestamp: -1 });
VaultTransactionSchema.index({ performedBy: 1, timestamp: -1 });
VaultTransactionSchema.index({ isVoid: 1 });

const VaultTransactionModel =
  mongoose.models?.vaultTransactions ||
  model('vaultTransactions', VaultTransactionSchema);

export default VaultTransactionModel;

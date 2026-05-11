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

    openingBalance: { type: Number, required: true, min: 0 },
    openingDenominations: [DenominationSchema],

    currentDenominations: [DenominationSchema],

    closingBalance: { type: Number, min: 0 },
    closingDenominations: [DenominationSchema],

    reconciliations: [
      {
        timestamp: { type: Date, required: true },
        previousBalance: { type: Number, required: true },
        newBalance: { type: Number, required: true },
        denominations: [DenominationSchema],
        reason: { type: String, required: true },
        comment: { type: String, required: true },
      },
    ],

    canClose: { type: Boolean, default: true },

    isReconciled: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

VaultShiftSchema.index({ locationId: 1, status: 1 });
VaultShiftSchema.index({ vaultManagerId: 1, createdAt: -1 });

const VaultShiftModel =
  mongoose.models?.vaultShifts || model('vaultShifts', VaultShiftSchema);

export default VaultShiftModel;

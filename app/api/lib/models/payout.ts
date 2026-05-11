import mongoose, { model, Schema } from 'mongoose';

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

    ticketNumber: { type: String },
    ticketBarcode: { type: String },
    printedAt: { type: Date },

    machineId: { type: String },
    machineSerialNumber: { type: String },
    reason: { type: String },

    validated: { type: Boolean, default: false },
    validationMethod: { type: String },

    timestamp: { type: Date, required: true, default: Date.now, index: true },
    cashierFloatBefore: { type: Number, required: true },
    cashierFloatAfter: { type: Number, required: true },

    transactionId: { type: String, required: true },

    notes: { type: String },
    cashierName: { type: String },
    status: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

PayoutSchema.index({ locationId: 1, timestamp: -1 });
PayoutSchema.index({ cashierId: 1, timestamp: -1 });
PayoutSchema.index({ type: 1, timestamp: -1 });
PayoutSchema.index({ ticketNumber: 1 }, { sparse: true });
PayoutSchema.index({ machineId: 1, timestamp: -1 }, { sparse: true });

const PayoutModel = mongoose.models?.payouts || model('payouts', PayoutSchema);

export default PayoutModel;

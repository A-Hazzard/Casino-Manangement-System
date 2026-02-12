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

/**
 * Float Request Schema
 * Cashier float increase/decrease requests (C-3)
 */
const FloatRequestSchema = new Schema(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true, index: true },
    cashierId: { type: String, required: true, index: true },
    cashierShiftId: { type: String, required: true },
    vaultShiftId: { type: String, required: true },

    type: {
      type: String,
      enum: ['increase', 'decrease'],
      required: true,
    },

    // Request details
    requestedAmount: { type: Number, required: true, min: 0 },
    requestedDenominations: [DenominationSchema],
    requestNotes: { type: String },
    requestedAt: { type: Date, required: true, default: Date.now },

    // Approval workflow
    status: {
      type: String,
      enum: ['pending', 'approved', 'approved_vm', 'denied', 'edited', 'cancelled'],
      default: 'pending',
      required: true,
      index: true,
    },
    approvedAmount: { type: Number, min: 0 },
    approvedDenominations: [DenominationSchema],
    processedBy: { type: String }, // VM user ID
    processedAt: { type: Date },
    vmNotes: { type: String },
    
    // Transaction reference
    transactionId: { type: String }, // Link to vaultTransactions

    // Notification tracking
    notificationSent: { type: Boolean, default: false },
    notificationSentAt: { type: Date },
    notificationReadAt: { type: Date },
    notificationDismissedAt: { type: Date },

    // Audit trail
    auditLog: [
      {
        action: {
          type: String,
          enum: [
            'created',
            'approved',
            'denied',
            'edited',
            'viewed',
            'failed',
            'cancelled',
            'confirmed',
          ],
          required: true,
        },
        performedBy: { type: String, required: true },
        timestamp: { type: Date, required: true, default: Date.now },
        notes: { type: String },
        metadata: { type: Schema.Types.Mixed },
      },
    ],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes for performance
FloatRequestSchema.index({ locationId: 1, status: 1, requestedAt: -1 });
FloatRequestSchema.index({ cashierId: 1, createdAt: -1 });
FloatRequestSchema.index({ vaultShiftId: 1, status: 1 });

const FloatRequestModel =
  mongoose.models?.floatRequests || model('floatRequests', FloatRequestSchema);

export default FloatRequestModel;

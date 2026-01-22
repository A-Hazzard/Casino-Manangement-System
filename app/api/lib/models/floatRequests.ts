/**
 * Float Request Model
 *
 * Mongoose model for cashier float requests (increase/decrease).
 * Tracks float requests from cashiers and their approval status.
 *
 * @module app/api/lib/models/floatRequests
 */

import { model, models, Schema } from 'mongoose';

// ============================================================================
// Schema Definition
// ============================================================================

const FLOAT_REQUEST_TYPES = ['FLOAT_INCREASE', 'FLOAT_DECREASE'] as const;

const FLOAT_REQUEST_STATUSES = [
  'PENDING',
  'APPROVED',
  'REJECTED',
  'CONFIRMED',
  'ACKNOWLEDGED',
] as const;

const floatRequestSchema = new Schema(
  {
    _id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: FLOAT_REQUEST_TYPES,
      index: true,
    },
    cashierName: { type: String },
    cashierId: { type: String, required: true, index: true },
    requestedDenom: {
      type: Schema.Types.Mixed,
      required: true,
    },
    requestedTotalAmount: {
      type: Number,
      required: true,
      min: [0, 'Requested total amount must be non-negative'],
    },
    requestedFloatAt: { type: Date },
    shiftId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: FLOAT_REQUEST_STATUSES,
      default: 'PENDING',
      index: true,
    },
    totalAmount: { type: Number },
    location: { type: String },
    locationId: { type: String, required: true, index: true },
    approvedDenom: {
      type: Schema.Types.Mixed,
      default: () => ({
        '20': 0,
        '50': 0,
        '100': 0,
        '500': 0,
        '1000': 0,
        '2000': 0,
        '5000': 0,
      }),
    },
    approvedFloatAt: { type: Date },
    approvedTotalAmount: { type: Number, default: 0 },
    approvedBy: { type: String },
    rejectedBy: { type: String },
    rejectionReason: { type: String },
    acknowledgedByCashier: { type: Boolean, default: false },
    acknowledgedByManager: { type: Boolean, default: false },
    acknowledgedAt: { type: Date },
    deletedAt: {
      type: Date,
      default: new Date('1969-12-31T23:59:59.999+0000'),
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    __v: { type: Number },
  },
  { timestamps: true, collection: 'floatrequests' }
);

// ============================================================================
// Indexes
// ============================================================================

floatRequestSchema.index({ locationId: 1, status: 1, createdAt: -1 });
// Note: cashierId and shiftId single indexes are already created by index: true in schema (lines 36, 47)

// ============================================================================
// Validation
// ============================================================================

floatRequestSchema.pre('save', function (next) {
  // Validate requestedTotalAmount matches sum of requestedDenom
  if (this.requestedDenom && typeof this.requestedDenom === 'object') {
    const denom = this.requestedDenom as Record<string, number>;
    const calculatedTotal = Object.entries(denom).reduce(
      (sum, [value, count]) => sum + Number(value) * (count || 0),
      0
    );

    if (Math.abs(calculatedTotal - this.requestedTotalAmount) > 0.01) {
      return next(
        new Error(
          'Requested total amount does not match denomination breakdown'
        )
      );
    }
  }

  // Validate approvedTotalAmount matches sum of approvedDenom when approved
  if (
    this.status === 'APPROVED' &&
    this.approvedDenom &&
    typeof this.approvedDenom === 'object'
  ) {
    const denom = this.approvedDenom as Record<string, number>;
    const calculatedTotal = Object.entries(denom).reduce(
      (sum, [value, count]) => sum + Number(value) * (count || 0),
      0
    );

    if (Math.abs(calculatedTotal - this.approvedTotalAmount) > 0.01) {
      return next(
        new Error('Approved total amount does not match approved denomination breakdown')
      );
    }
  }

  next();
});

// ============================================================================
// Model Export
// ============================================================================

export const FloatRequest =
  models.floatrequests || model('floatrequests', floatRequestSchema);

export type FloatRequestType = (typeof FLOAT_REQUEST_TYPES)[number];
export type FloatRequestStatus = (typeof FLOAT_REQUEST_STATUSES)[number];

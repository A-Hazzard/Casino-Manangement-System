/**
 * Denomination Model
 *
 * Mongoose model for tracking currency denominations per location.
 * Used for vault balance calculations and cash reporting.
 *
 * @module app/api/lib/models/denominations
 */

import { model, models, Schema } from 'mongoose';

// ============================================================================
// Schema Definition
// ============================================================================

const ALLOWED_DENOMINATION_VALUES = [
  1, 20, 50, 100, 500, 1000, 2000, 5000,
] as const;

const denominationSchema = new Schema(
  {
    _id: { type: String, required: true },
    value: {
      type: Number,
      required: true,
      enum: ALLOWED_DENOMINATION_VALUES,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Amount must be non-negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Amount must be an integer',
      },
    },
    locationId: { type: String, required: true, index: true },
    date: { type: Date, required: true, index: true },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true, collection: 'denomination' }
);

// ============================================================================
// Indexes
// ============================================================================

denominationSchema.index({ locationId: 1, value: 1, date: -1 });
// Note: locationId and date single indexes are already created by index: true in schema (lines 39, 40)

// ============================================================================
// Validation
// ============================================================================

denominationSchema.pre('save', function (next) {
  // Validate value is one of allowed denominations
  const value = this.value as number;
  if (!ALLOWED_DENOMINATION_VALUES.includes(value as (typeof ALLOWED_DENOMINATION_VALUES)[number])) {
    return next(
      new Error(
        `Denomination value must be one of: ${ALLOWED_DENOMINATION_VALUES.join(', ')}`
      )
    );
  }

  // Validate amount is non-negative integer
  if (this.amount < 0 || !Number.isInteger(this.amount)) {
    return next(new Error('Amount must be a non-negative integer'));
  }

  next();
});

// ============================================================================
// Model Export
// ============================================================================

export const Denomination =
  models.denomination || model('denomination', denominationSchema);

export type DenominationValue = (typeof ALLOWED_DENOMINATION_VALUES)[number];

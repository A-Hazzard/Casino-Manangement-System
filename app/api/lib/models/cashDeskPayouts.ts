/**
 * Cash Desk Payout Model
 *
 * Mongoose model for player payouts processed by cashiers.
 * Tracks ticket, hand-pay, and cash-desk payments.
 *
 * @module app/api/lib/models/cashDeskPayouts
 */

import { model, models, Schema } from 'mongoose';

// ============================================================================
// Schema Definition
// ============================================================================

const PAYOUT_TYPES = ['Ticket', 'Hand-Pay', 'Cash-Desk'] as const;

const payoutSchema = new Schema(
  {
    _id: { type: String, required: true },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Payout amount must be positive'],
    },
    machineSerialNumber: { type: String },
    memberName: { type: String },
    type: {
      type: String,
      required: true,
      enum: PAYOUT_TYPES,
      index: true,
    },
    cashierName: { type: String },
    cashierId: { type: String, required: true, index: true },
    locationId: { type: String, required: true, index: true },
    location: { type: String },
    shiftId: { type: String, required: true, index: true },
    ticketNumber: { type: String },
    imageUrl: { type: String },
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date },
    deletedAt: {
      type: Date,
      default: new Date('1969-12-31T23:59:59.999+0000'),
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
  },
  { timestamps: true, collection: 'cashdeskpayouts' }
);

// ============================================================================
// Indexes
// ============================================================================

payoutSchema.index({ locationId: 1, createdAt: -1 });
// Note: cashierId, shiftId, and type single indexes are already created by index: true in schema (lines 32, 35, 38)
payoutSchema.index({ ticketNumber: 1 });

// ============================================================================
// Validation
// ============================================================================

payoutSchema.pre('save', function (next) {
  // Validate ticketNumber is provided for Ticket type
  if (this.type === 'Ticket' && !this.ticketNumber) {
    return next(new Error('Ticket number is required for Ticket payouts'));
  }

  // Validate amount is positive
  if (this.amount <= 0) {
    return next(new Error('Payout amount must be positive'));
  }

  next();
});

// ============================================================================
// Model Export
// ============================================================================

export const CashDeskPayout =
  models.cashdeskpayouts || model('cashdeskpayouts', payoutSchema);

export type PayoutType = (typeof PAYOUT_TYPES)[number];

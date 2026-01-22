/**
 * Shift Model
 *
 * Unified Mongoose model for cashier and vault manager shifts.
 * Tracks shift start/end times and denomination breakdowns.
 *
 * @module app/api/lib/models/shifts
 */

import { model, models, Schema } from 'mongoose';

// ============================================================================
// Schema Definition
// ============================================================================

const SHIFT_ROLES = ['cashier', 'vault-manager'] as const;
const SHIFT_STATUSES = ['Open', 'Close'] as const;

const shiftSchema = new Schema(
  {
    _id: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: SHIFT_ROLES,
      index: true,
    },
    userName: { type: String },
    userId: { type: String, required: true, index: true },
    startDenom: {
      type: Schema.Types.Mixed,
      required: true,
    },
    endDenom: {
      type: Schema.Types.Mixed,
      required: false,
    },
    startedShiftAt: { type: Date, required: true, index: true },
    closedShiftAt: { type: Date },
    location: { type: String },
    locationId: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: SHIFT_STATUSES,
      default: 'Open',
      index: true,
    },
    notes: { type: String },
    deletedAt: {
      type: Date,
      default: new Date('1969-12-31T23:59:59.999+0000'),
    },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    __v: { type: Number },
  },
  { timestamps: true, collection: 'shifts' }
);

// ============================================================================
// Indexes
// ============================================================================

shiftSchema.index({ locationId: 1, role: 1, status: 1 });
shiftSchema.index({ userId: 1, status: 1 });
// Note: locationId single index is already created by index: true in schema (line 41)
shiftSchema.index({ startedShiftAt: -1 });

// ============================================================================
// Validation
// ============================================================================

shiftSchema.pre('save', function (next) {
  // Validate closedShiftAt is after startedShiftAt if provided
  if (
    this.closedShiftAt &&
    this.startedShiftAt &&
    this.closedShiftAt < this.startedShiftAt
  ) {
    return next(
      new Error('Closed shift time must be after started shift time')
    );
  }

  // Validate status matches closedShiftAt
  if (this.status === 'Close' && !this.closedShiftAt) {
    return next(
      new Error('Closed shift time is required when status is Close')
    );
  }

  if (this.status === 'Open' && this.closedShiftAt) {
    return next(
      new Error('Closed shift time should not be set when status is Open')
    );
  }

  next();
});

// ============================================================================
// Model Export
// ============================================================================

export const Shift = models.shifts || model('shifts', shiftSchema);

export type ShiftRole = (typeof SHIFT_ROLES)[number];
export type ShiftStatus = (typeof SHIFT_STATUSES)[number];

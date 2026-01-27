import mongoose, { Schema } from 'mongoose';
import type { InterLocationTransfer } from '@/shared/types/vault';

const interLocationTransferSchema = new Schema<InterLocationTransfer>(
  {
    _id: { type: String, required: true },
    fromLocationId: { type: String, required: true },
    toLocationId: { type: String, required: true },
    fromLocationName: { type: String, required: true },
    toLocationName: { type: String, required: true },
    amount: { type: Number, required: true },
    denominations: [
      {
        denomination: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'completed', 'cancelled'],
      default: 'pending',
    },
    requestedBy: { type: String, required: true },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    completedAt: { type: Date },
    transactionId: { type: String },
    notes: { type: String },
  },
  { timestamps: true }
);

export const InterLocationTransferModel =
  (mongoose.models
    ?.InterLocationTransfer as mongoose.Model<InterLocationTransfer>) ||
  mongoose.model<InterLocationTransfer>(
    'InterLocationTransfer',
    interLocationTransferSchema
  );

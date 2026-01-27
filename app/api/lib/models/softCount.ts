import mongoose, { Schema } from 'mongoose';
import type { SoftCount } from '@/shared/types/vault';

const softCountSchema = new Schema<SoftCount>(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true },
    countedAt: { type: Date, required: true },
    amount: { type: Number, required: true },
    denominations: [
      {
        denomination: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    countedBy: { type: String, required: true },
    transactionId: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const SoftCountModel =
  (mongoose.models?.SoftCount as mongoose.Model<SoftCount>) ||
  mongoose.model<SoftCount>('SoftCount', softCountSchema);

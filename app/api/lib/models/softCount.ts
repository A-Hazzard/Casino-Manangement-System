import type { SoftCount } from '@/shared/types/vault';
import mongoose, { Schema } from 'mongoose';

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
    machineId: { type: String },
    transactionId: { type: String, required: true },
    notes: { type: String },
    isEndOfDay: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const SoftCountModel =
  (mongoose.models?.SoftCount as mongoose.Model<SoftCount>) ||
  mongoose.model<SoftCount>('SoftCount', softCountSchema);

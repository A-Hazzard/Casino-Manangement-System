import mongoose, { Schema } from 'mongoose';
import type { MachineCollection } from '@/shared/types/vault';

const machineCollectionSchema = new Schema<MachineCollection>(
  {
    _id: { type: String, required: true },
    locationId: { type: String, required: true },
    machineId: { type: String, required: true },
    machineName: { type: String },
    collectedAt: { type: Date, required: true },
    amount: { type: Number, required: true },
    denominations: [
      {
        denomination: { type: Number, required: true },
        quantity: { type: Number, required: true },
      },
    ],
    collectedBy: { type: String, required: true },
    transactionId: { type: String, required: true },
    notes: { type: String },
  },
  { timestamps: true }
);

export const MachineCollectionModel =
  (mongoose.models?.MachineCollection as mongoose.Model<MachineCollection>) ||
  mongoose.model<MachineCollection>(
    'MachineCollection',
    machineCollectionSchema
  );

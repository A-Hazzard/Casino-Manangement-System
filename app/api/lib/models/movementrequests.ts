import mongoose, { Schema } from 'mongoose';
import type { MovementRequest as MovementRequestType } from '@/lib/types/movementRequests';

const movementRequestSchema = new Schema<MovementRequestType>(
  {
    _id: { type: String },
    variance: { type: Number, required: true },
    previousBalance: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    amountToCollect: { type: Number, required: true },
    amountCollected: { type: Number, required: true },
    amountUncollected: { type: Number, required: true },
    partnerProfit: { type: Number, required: true },
    taxes: { type: Number, required: true },
    advance: { type: Number, required: true },
    locationName: { type: String, required: true },
    locationFrom: { type: String, required: true },
    locationTo: { type: String, required: true },
    locationId: { type: String, required: true },
    createdBy: { type: String, required: true },
    movementType: { type: String, required: true },
    installationType: { type: String, required: true },
    reason: { type: String },
    requestTo: { type: String, required: true },
    cabinetIn: { type: String },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'in progress'],
      required: true,
    },
    timestamp: { type: Date, required: true },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    __v: { type: Number },
    approvedBy: { type: String },
    approvedBySecond: { type: String },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export const MovementRequest =
  (mongoose.models?.MovementRequest as mongoose.Model<MovementRequestType>) ||
  mongoose.model<MovementRequestType>('MovementRequest', movementRequestSchema);

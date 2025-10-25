import { model, models, Schema } from 'mongoose';

const acceptedBillSchema = new Schema(
  {
    _id: String,
    value: { type: Number, required: true },
    machine: { type: String, required: true },
    location: { type: String, required: true },
    member: { type: String, required: true, default: 'ANONYMOUS' },
    movement: {
      dollar1: { type: Number, default: 0 },
      dollar2: { type: Number, default: 0 },
      dollar5: { type: Number, default: 0 },
      dollar10: { type: Number, default: 0 },
      dollar20: { type: Number, default: 0 },
      dollar50: { type: Number, default: 0 },
      dollar100: { type: Number, default: 0 },
      dollar500: { type: Number, default: 0 },
      dollar1000: { type: Number, default: 0 },
      dollar2000: { type: Number, default: 0 },
      dollar5000: { type: Number, default: 0 },
      dollarTotal: { type: Number, default: 0 },
      dollarTotalUnknown: { type: Number, default: 0 },
    },
    readAt: { type: Date, required: true },
    createdAt: { type: Date }, // This will be set by timestamps, but explicitly included for clarity
    updatedAt: { type: Date }, // This will be set by timestamps, but explicitly included for clarity
  },
  {
    timestamps: true,
  }
);

/**
 * Mongoose model for accepted bills, including value, machine, location, member, movement, readAt, createdAt, and updatedAt.
 */
export const AcceptedBill =
  models['acceptedbills'] ?? model('acceptedbills', acceptedBillSchema);

import { model, models, Schema, Types } from "mongoose";

const acceptedBillSchema = new Schema(
  {
    value: { type: Number, required: true },
    machine: { type: Types.ObjectId, ref: "machines", required: true },
    location: { type: Types.ObjectId, ref: "locations", required: true },
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
      dollarTotalUnknown: { type: Number, default: 0 }
    },
    readAt: { type: Date, required: true },
  },
  {
    timestamps: true,
  }
);

/**
 * Mongoose model for accepted bills, including value, machine, location, movement, and readAt.
 */
export const AcceptedBill =
  models["acceptedbills"] ?? model("acceptedbills", acceptedBillSchema);
import { model, models, Schema } from "mongoose";

const acceptedBillSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    value: { type: Number, required: true },
    machine: { type: String, required: true },
    member: { type: String, required: true },
  },
  { timestamps: true }
);

/**
 * Mongoose model for accepted bills, including value, machine, and member.
 */
export const AcceptedBill =
  models["acceptedbills"] ?? model("acceptedbills", acceptedBillSchema);

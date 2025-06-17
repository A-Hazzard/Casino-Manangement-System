import { Schema, model, models, Types } from "mongoose";

const firmwareSchema = new Schema(
  {
    product: { type: String, required: true },
    version: { type: String, required: true },
    versionDetails: { type: String },
    fileId: { type: Types.ObjectId, required: true }, // GridFS file reference
  },
  { timestamps: true }
);

export const Firmware = models.Firmware || model("Firmware", firmwareSchema);

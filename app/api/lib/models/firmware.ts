import { Schema, model, models, Types } from 'mongoose';

const firmwareSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    product: { type: String, required: true },
    version: { type: String, required: true },
    versionDetails: { type: String },
    fileId: { type: Types.ObjectId, required: true }, // GridFS file reference
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

firmwareSchema.index({ deletedAt: 1 });

export const Firmware = models.Firmware || model('Firmware', firmwareSchema);

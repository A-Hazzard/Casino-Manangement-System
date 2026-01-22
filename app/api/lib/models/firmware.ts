import { Schema, model, models } from 'mongoose';

const firmwareSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    product: { type: String, required: true },
    version: { type: String, required: true },
    versionDetails: { type: String },
    fileId: { type: Schema.Types.ObjectId, required: true }, // GridFS file reference
    fileName: { type: String, required: true },
    fileSize: { type: Number, required: true },
    deletedAt: { type: Date, default: null },
    // Missing fields found in POST route
    releaseDate: { type: Date, default: Date.now },
    description: { type: String },
    downloadUrl: { type: String },
    checksum: { type: String },
  },
  { timestamps: true, strict: false }
);

firmwareSchema.index({ deletedAt: 1 });
firmwareSchema.index({ product: 1, version: 1 });

export const Firmware = models.Firmware || model('Firmware', firmwareSchema);


import { model, models, Schema } from "mongoose";

const LicenceeSchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    country: { type: String },
    startDate: { type: Date },
    expiryDate: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    geoCoords: {
      latitude: { type: Number },
      longitude: { type: Number },
      zoomRatio: { type: Number },
    },
  },
  { timestamps: true, versionKey: false }
);

export const Licencee = models.Licencee || model("Licencee", LicenceeSchema);

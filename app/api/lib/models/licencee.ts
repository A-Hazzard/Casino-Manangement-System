import { model, models, Schema } from 'mongoose';

const LicenceeSchema = new Schema(
  {
    _id: { type: String },
    name: { type: String, required: true },
    description: { type: String },
    country: { type: String },
    startDate: { type: Date },
    expiryDate: { type: Date, default: null },
    prevStartDate: { type: Date },
    prevExpiryDate: { type: Date },
    isPaid: { type: Boolean },
    licenseKey: { type: String, unique: true, required: true },
    status: { type: String, default: 'active' },
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

LicenceeSchema.index({ status: 1 });

export const Licencee =
  models.Licencee || model('Licencee', LicenceeSchema, 'licencees');

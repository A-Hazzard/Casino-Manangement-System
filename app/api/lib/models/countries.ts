import { Schema, model, models } from 'mongoose';

const CountrySchema = new Schema(
  {
    _id: String,
    name: {
      type: String,
      required: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const Countries = models.Countries || model('Countries', CountrySchema);

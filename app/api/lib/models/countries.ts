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

/**
 * Mongoose model for country data, including ISO codes and names.
 */
export const Countries = models.Countries || model('Countries', CountrySchema);


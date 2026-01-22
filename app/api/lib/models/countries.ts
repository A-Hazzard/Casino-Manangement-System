import { Schema, model, models } from 'mongoose';

const CountrySchema = new Schema(
  {
    _id: String,
    name: {
      type: String,
      required: true,
    },
    alpha2: {
      type: String,
      required: true,
    },
    alpha3: {
      type: String,
      required: true,
    },
    isoNumeric: {
      type: String,
      required: true,
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


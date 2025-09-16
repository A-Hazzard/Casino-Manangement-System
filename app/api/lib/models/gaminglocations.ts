import { model, models, Schema } from "mongoose";

const GamingLocationsSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: String,
    country: String,
    address: {
      street: String,
      city: String,
    },
    rel: {
      licencee: String,
    },
    profitShare: Number,
    collectionBalance: Number,
    previousCollectionTime: Date,
    gameDayOffset: Number,
    isLocalServer: Boolean,
    billValidatorOptions: {
      denom1: Boolean,
      denom2: Boolean,
      denom5: Boolean,
      denom10: Boolean,
      denom20: Boolean,
      denom50: Boolean,
      denom100: Boolean,
      denom200: Boolean,
      denom500: Boolean,
      denom1000: Boolean,
      denom2000: Boolean,
      denom5000: Boolean,
      denom10000: Boolean,
    },
    geoCoords: {
      latitude: Number,
      longitude: Number,
      longtitude: Number,
    },
    createdAt: Date,
    updatedAt: Date,
    deletedAt: Date,
    status: String,
    statusHistory: [Schema.Types.Mixed],
    noSMIBLocation: Boolean,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Critical indexes for aggregation performance
GamingLocationsSchema.index({ "rel.licencee": 1, deletedAt: 1 }); // For licencee-based queries
GamingLocationsSchema.index({ deletedAt: 1 }); // For active locations
GamingLocationsSchema.index({ _id: 1, deletedAt: 1 }); // For location lookups

/**
 * Mongoose model for gaming locations, including schema for address, geo-coordinates, and status.
 */
export const GamingLocations =
  models.GamingLocations || model("GamingLocations", GamingLocationsSchema);

import { model, models, Schema } from 'mongoose';

const GamingLocationsSchema = new Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
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
    // Membership configuration
    membershipEnabled: {
      type: Boolean,
      default: false,
    },
    locationMembershipSettings: {
      enableFreePlays: { type: Boolean, default: false },
      pointsRatioMethod: { type: String, default: '' },
      gamesPlayedRatio: { type: Number, default: 0 },
      wagerRatio: { type: Number, default: 0 },
      pointMethodValue: { type: Number, default: 0 },
      pointsMethodGameTypes: { type: [String], default: [] },
      freePlayGameTypes: { type: [String], default: [] },
      freePlayAmount: { type: Number, default: 0 },
      enablePoints: { type: Boolean, default: false },
      freePlayCreditsTimeout: { type: Number, default: 0 },
      locationLimit: { type: Number, default: 0 },
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
GamingLocationsSchema.index({ 'rel.licencee': 1, deletedAt: 1 }); // For licencee-based queries
GamingLocationsSchema.index({ deletedAt: 1 }); // For active locations
GamingLocationsSchema.index({ _id: 1, deletedAt: 1 }); // For location lookups
GamingLocationsSchema.index({
  membershipEnabled: 1,
  deletedAt: 1,
}); // For membership-enabled location queries

/**
 * Mongoose model for gaming locations, including schema for address, geo-coordinates, and status.
 */
export const GamingLocations =
  models.GamingLocations || model('GamingLocations', GamingLocationsSchema);

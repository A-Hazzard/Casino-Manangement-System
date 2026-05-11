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

    membershipEnabled: {
      type: Boolean,
      default: false,
    },
    aceEnabled: {
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
    deletedAt: {
      type: Date,
      default: () => new Date(-1),
    },
    status: String,
    statusHistory: [Schema.Types.Mixed],
    noSMIBLocation: Boolean,
    fullSMIBs: Boolean,
    semiSMIBs: Boolean,
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

GamingLocationsSchema.index(
  { name: 1 },
  {
    name: 'unique_active_location_name',
    unique: true,
    partialFilterExpression: { deletedAt: { $lt: new Date('2025-01-01') } },
  }
);

GamingLocationsSchema.index({ 'rel.licencee': 1, deletedAt: 1 });
GamingLocationsSchema.index({ deletedAt: 1 });
GamingLocationsSchema.index({ _id: 1, deletedAt: 1 });
GamingLocationsSchema.index({
  membershipEnabled: 1,
  deletedAt: 1,
});

export const GamingLocations =
  models.GamingLocations || model('GamingLocations', GamingLocationsSchema);

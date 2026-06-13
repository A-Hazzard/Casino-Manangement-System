import mongoose, { Schema, models, model } from 'mongoose';

export type CollectionSessionV2Document = {
  _id: string;
  sessionId: string;
  locationId: string;
  licencee: string;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  previousBalance: number;
  currentBalance: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  balanceCorrection: number;
  balanceCorrectionReas: string;
  variance: number | string;
  varianceReason: string;
  reasonShortagePayment: string;
  locationProfitPerc: number;
  includeJackpot: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const collectionSessionV2Schema = new Schema<CollectionSessionV2Document>(
  {
    _id: { type: String },
    sessionId: { type: String, required: true, unique: true, index: true },
    locationId: { type: String },
    licencee: { type: String },
    amountToCollect: { type: Number, default: 0 },
    amountCollected: { type: Number, default: 0 },
    amountUncollected: { type: Number, default: 0 },
    previousBalance: { type: Number, default: 0 },
    currentBalance: { type: Number, default: 0 },
    partnerProfit: { type: Number, default: 0 },
    taxes: { type: Number, default: 0 },
    advance: { type: Number, default: 0 },
    balanceCorrection: { type: Number, default: 0 },
    balanceCorrectionReas: { type: String, default: '' },
    variance: { type: Schema.Types.Mixed, default: 0 },
    varianceReason: { type: String, default: '' },
    reasonShortagePayment: { type: String, default: '' },
    locationProfitPerc: { type: Number, default: 0 },
    includeJackpot: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const CollectionSessionV2 =
  (models.CollectionSessionV2 as mongoose.Model<CollectionSessionV2Document>) ||
  model<CollectionSessionV2Document>('CollectionSessionV2', collectionSessionV2Schema, 'collection_sessions_v2');

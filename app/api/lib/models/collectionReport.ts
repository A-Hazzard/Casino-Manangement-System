import mongoose, { Schema, Document, Types } from "mongoose";

// Define a type for the collection report schema
export type ICollectionReport = Document & {
  timestamp: Date;
  collectorName: string;
  locationName: string;
  location: Types.ObjectId | string;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross: number;
  previousBalance: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  variance: number;
  varianceReason?: string;
  previousCollectionTime?: Date;
  locationReportId: string;
  locationProfitPerc?: number;
  reasonShortagePayment?: string;
  balanceCorrection?: number;
  balanceCorrectionReas?: string;
  currentBalance?: number;
  notes?: string;
  // Timestamps
  createdAt?: Date;
  updatedAt?: Date;
};

const collectionReportSchema = new Schema<ICollectionReport>(
  {
    variance: { type: Number, required: true },
    previousBalance: { type: Number, required: true },
    currentBalance: { type: Number, required: true },
    amountToCollect: { type: Number, required: true },
    amountCollected: { type: Number, required: true },
    amountUncollected: { type: Number, required: true },
    partnerProfit: { type: Number, required: true },
    taxes: { type: Number, required: true },
    advance: { type: Number, required: true },
    collectorName: { type: String, required: true },
    locationName: { type: String, required: true },
    locationReportId: { type: String, required: true },
    location: { type: String, required: true },
    totalDrop: { type: Number, required: true },
    totalCancelled: { type: Number, required: true },
    totalGross: { type: Number, required: true },
    totalSasGross: { type: Number, required: true },
    timestamp: { type: Date, required: true },
    varianceReason: { type: String },
    previousCollectionTime: { type: Date },
    locationProfitPerc: { type: Number },
    reasonShortagePayment: { type: String },
    balanceCorrection: { type: Number },
    balanceCorrectionReas: { type: String },
  },
  { timestamps: true }
);

// Create the model if it doesn't exist or use the existing one
export const CollectionReport =
  (mongoose.models?.CollectionReport as mongoose.Model<ICollectionReport>) ||
  mongoose.model<ICollectionReport>("CollectionReport", collectionReportSchema);

import mongoose, { Schema } from "mongoose";
import type { ICollectionReport } from "@/lib/types/api";

const collectionReportSchema = new Schema<ICollectionReport>(
  {
    _id: { type: String },
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
    machinesCollected: { type: String },
    createdAt: { type: Date },
    updatedAt: { type: Date },
    __v: { type: Number },
  },
  { timestamps: true }
);

// Create the model if it doesn't exist or use the existing one
export const CollectionReport =
  (mongoose.models?.CollectionReport as mongoose.Model<ICollectionReport>) ||
  mongoose.model<ICollectionReport>("CollectionReport", collectionReportSchema);

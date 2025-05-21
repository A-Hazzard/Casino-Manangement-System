import { MongoDBQueryValue } from "./mongo";
import mongoose from "mongoose";

export type Machine = {
  _id: string;
  serialNumber: string;
  game: string;
  gameType: string;
  isCronosMachine: boolean;
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    [key: string]: unknown;
  };
  cabinetType: string;
  assetStatus: string;
  gamingLocation: string;
  relayId: string;
  collectionTime?: string;
  collectionMeters?: {
    metersIn: number;
    metersOut: number;
  };
  billValidator?: BillValidatorData;
  lastActivity?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  collectionMetersHistory?: CollectionMetersHistoryEntry[];
};

export type MachineMatchStage = {
  "machines.serialNumber"?: { $regex: string; $options: string };
  "machines.relayId"?: { $regex: string; $options: string };
  name?: { $regex: string; $options: string };
  [key: string]: MongoDBQueryValue | undefined;
};

export type MachineAggregationMatchStage = {
  deletedAt?: { $in: (Date | null)[] };
  _id?: mongoose.Types.ObjectId;
  "rel.licencee"?: string;
  locations?: string;
  "start_date.date"?: { $lte: Date };
  "end_date.date"?: { $gte: Date };
  // For machine search
  "machines.serialNumber"?: { $regex: string; $options: string };
  "machines.relayId"?: { $regex: string; $options: string };
  name?: { $regex: string; $options: string };
};

export type NewMachineData = {
  serialNumber: string;
  game: string;
  gameType: string;
  isCronosMachine: boolean;
  accountingDenomination: string | number;
  cabinetType: string;
  assetStatus: string;
  gamingLocation: string;
  smibBoard: string;
  collectionSettings?: {
    multiplier?: string;
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
};

export type MachineUpdateData = {
  serialNumber?: string;
  game?: string;
  gameType?: string;
  isCronosMachine?: boolean;
  gameConfig?: {
    accountingDenomination?: number;
  };
  cabinetType?: string;
  assetStatus?: string;
  gamingLocation?: string;
  relayId?: string;
  collectionTime?: string;
  collectionMeters?: {
    metersIn?: number;
    metersOut?: number;
  };
  updatedAt?: Date;
};

export type CollectionMetersHistoryEntry = {
  _id: string;
  metersIn: number;
  metersOut: number;
  prevMetersIn: number;
  prevMetersOut: number;
  timestamp: string;
  locationReportId: string;
};

export type BillValidatorData = {
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  firmwareVersion?: string;
  billsAccepted?: Array<{ denomination: number; count: number }>;
  lastActivity?: string;
  status?: string;
};

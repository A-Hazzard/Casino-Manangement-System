import type { Document } from "mongoose";
import type { CollectionReportMachineEntry } from "./collections";
import type {
  MongooseId,
  MongoMatchStage,
  WithTimestamps,
  ApiResponse,
  DateRange,
  RegexFilter,
  TimePeriod,
  PipelineStage,
  QueryFilter,
  ParamsType,
  CustomDate,
} from "@shared/types";

// Re-export shared types for convenience
export type {
  MongooseId,
  MongoMatchStage,
  WithTimestamps,
  ApiResponse,
  DateRange,
  RegexFilter,
  TimePeriod,
  PipelineStage,
  QueryFilter,
  ParamsType,
  CustomDate,
};

export type AcceptedBill = {
  _id: string;
  value: number;
  machine: string;
  member: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
};

export type MachineEvent = {
  _id: string;
  message: {
    incomingMessage: {
      typ: string;
      rly: string;
      mac: string;
      pyd: string;
    };
    serialNumber: string;
    game: string;
    gamingLocation: string;
  };
  machine: string;
  relay: string;
  commandType: string;
  command: string;
  description: string;
  date: string;
  cabinetId: string;
  gameName: string;
  location: string;
  createdAt: string;
  updatedAt: string;
  __v?: number;
};

export type SchedulerData = {
  _id: string;
  creator: string;
  collector: string;
  location: string;
  startTime: string;
  endTime: string;
  status: "pending" | "completed" | "canceled";
  createdAt: string;
  updatedAt: string;
  __v: number;
};

export type CreateCollectionReportPayload = {
  variance: number;
  previousBalance: number;
  currentBalance: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  collectorName: string;
  locationName: string;
  locationReportId: string;
  location: string;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross: number;
  timestamp: string | Date;
  varianceReason?: string;
  previousCollectionTime?: string | Date;
  locationProfitPerc?: number;
  reasonShortagePayment?: string;
  balanceCorrection?: number;
  balanceCorrectionReas?: string;
  machines: CollectionReportMachineEntry[];
};

export type CollectionReportMachineSummary = {
  _id: MongooseId;
  serialNumber: string;
  origSerialNumber?: string;
  machineId?: string;
  name: string;
  game?: string;
  custom?: { name?: string };
  relayId?: string;
  smibBoard?: string;
  smbId?: string;
  collectionMeters?: {
    metersIn: number;
    metersOut: number;
  };
  collectionTime?: string | Date;
};

export type CollectionReportLocationWithMachines = {
  _id: MongooseId;
  name: string;
  machines: CollectionReportMachineSummary[];
  previousCollectionTime?: string | Date;
  profitShare?: number;
  collectionBalance?: number;
  gameDayOffset?: number;
};

// Types for Collection Report Page
export type MachineMetric = {
  id: string;
  machineId: string;
  actualMachineId?: string;
  dropCancelled: string;
  metersGross: number;
  sasGross?: number | string;
  variation?: number | string;
  sasStartTime?: string;
  sasEndTime?: string;
  hasIssue?: boolean;
  ramClear?: boolean;
};

export type LocationMetric = {
  droppedCancelled: string;
  metersGross: number;
  variation: number;
  sasGross: number;
  locationRevenue: number;
  amountUncollected: number;
  amountToCollect: number;
  machinesNumber: string;
  collectedAmount: number;
  reasonForShortage?: string;
  taxes: number;
  advance: number;
  previousBalanceOwed: number;
  balanceCorrection: number;
  currentBalanceOwed: number;
  correctionReason?: string;
  variance?: number | string;
  varianceReason?: string;
};

export type SASMetric = {
  dropped: number;
  cancelled: number;
  gross: number;
};

export type CollectionReportData = {
  reportId: string;
  locationName: string;
  collectionDate: string;
  machineMetrics: MachineMetric[];
  locationMetrics: LocationMetric;
  sasMetrics?: SASMetric;
  isEditing?: boolean;
};

export type ICollectionReport = Document & {
  _id: string;
  variance: number;
  previousBalance: number;
  currentBalance: number;
  amountToCollect: number;
  amountCollected: number;
  amountUncollected: number;
  partnerProfit: number;
  taxes: number;
  advance: number;
  collectorName: string;
  locationName: string;
  locationReportId: string;
  location: string;
  totalDrop: number;
  totalCancelled: number;
  totalGross: number;
  totalSasGross: number;
  timestamp: Date;
  varianceReason?: string;
  previousCollectionTime?: Date;
  locationProfitPerc?: number;
  reasonShortagePayment?: string;
  balanceCorrection?: number;
  balanceCorrectionReas?: string;
  machinesCollected?: string;
  isEditing?: boolean;
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

export type IScheduler = Document & {
  licencee: string;
  location: string;
  collector: string;
  creator: string;
  startTime: Date;
  endTime: Date;
  status: "pending" | "completed" | "canceled";
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

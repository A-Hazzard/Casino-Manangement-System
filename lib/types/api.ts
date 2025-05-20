import { Types } from "mongoose";
import type { Document } from "mongoose";

// Generic MongoDB types
export type MongooseId = string | Types.ObjectId;

// MongoDB stages for aggregation pipelines
export type MongoMatchStage = {
  _id?: MongooseId | { $in: MongooseId[] };
  deletedAt?: { $in: (Date | null)[] };
};

// Database model related types
export type WithTimestamps = {
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
};

// Common API response types
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

// Date range type for filtering
export type DateRange = {
  start: Date;
  end: Date;
};

// Helper type for MongoDB filtering
export type RegexFilter = {
  $regex: string;
  $options: string;
};

// Helper type for getting multiple date ranges
export type TimePeriod =
  | "Today"
  | "Yesterday"
  | "last7days"
  | "7d"
  | "last30days"
  | "30d"
  | "Custom";

// Add PipelineStage type
export type PipelineStage = {
  [key: string]: unknown;
};

// Add QueryFilter from app/api/lib/types/index.ts
export type QueryFilter = {
  userId?: string;
  location?: string;
  machine?: string;
  readAt?: {
    $gte: Date;
    $lte: Date;
  };
};

// Add ParamsType from app/api/lib/types/index.ts
export type ApiParamsType = {
  timePeriod: "Today" | "Yesterday" | "7d" | "30d" | "Custom";
  licencee: string;
};

// Add CustomDate from app/api/lib/types/index.ts
export type CustomDate = {
  startDate: Date;
  endDate: Date;
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
};

export type CollectionReportMachineSummary = {
  _id: MongooseId;
  serialNumber: string;
  name: string;
};

export type CollectionReportLocationWithMachines = {
  _id: MongooseId;
  name: string;
  machines: CollectionReportMachineSummary[];
};

// Types for Collection Report Page
export type MachineMetric = {
  id: string;
  machineId: string;
  dropCancelled: string;
  meterGross: number;
  sasGross?: number | string;
  variation?: number | string;
  sasTimes?: string;
  hasIssue?: boolean;
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

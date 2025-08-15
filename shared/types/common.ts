// Shared common types used across frontend and backend
import { Types } from "mongoose";

// Generic API response type
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

// Time period type for analytics
export type TimePeriod =
  | "Today"
  | "Yesterday"
  | "last7days"
  | "7d"
  | "last30days"
  | "30d"
  | "All Time"
  | "Custom";

// MongoDB related types
export type MongooseId = string | Types.ObjectId;

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

// Helper type for MongoDB filtering
export type RegexFilter = {
  $regex: string;
  $options: string;
};

// Helper type for getting multiple date ranges
export type CustomDate = {
  startDate: Date | undefined;
  endDate: Date | undefined;
};

// Query filter type
export type QueryFilter = {
  userId?: string;
  location?: string;
  machine?: string;
  readAt?: {
    $gte: Date;
    $lte: Date;
  };
};

// API params type
export type ApiParamsType = {
  timePeriod: "Today" | "Yesterday" | "7d" | "30d" | "All Time" | "Custom";
  licencee: string;
};

// Pipeline stage type
export type PipelineStage = {
  [key: string]: unknown;
};

// Performance status
export type PerformanceStatus = "good" | "average" | "poor";

// Sort direction
export type SortDirection = "asc" | "desc";

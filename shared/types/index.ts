// Shared types index - exports all shared types for easy importing
export type {
  ApiResponse,
  DateRange,
  TimePeriod,
  MongooseId,
  MongoMatchStage,
  WithTimestamps,
  RegexFilter,
  CustomDate,
  QueryFilter,
  ApiParamsType,
  PipelineStage,
  PerformanceStatus,
  SortDirection,
} from "./common";

export type { LoginFormProps } from "./auth";

// Database types
export type {
  DateRangeFilter,
  RegexFilter as DbRegexFilter,
  ArrayFilter,
  ExpressionFilter,
  MongoDBQueryValue,
  MongooseCache,
  MongoQuery,
  MeterMovement,
  SasMeters,
  MeterData,
  CollectionMetersHistoryEntry,
  BillValidatorData,
} from "./database";

// Entity types
export type {
  Location,
  Address,
  RelationshipInfo,
  GeoCoordinates,
  AggregatedLocation,
  Machine,
  MachineDocument,
  Cabinet,
  SmibConfig,
  User,
  ResourcePermissions,
  Licensee,
  Country,
  Firmware,
  MovementRequest,
  MovementRequestStatus,
} from "./entities";

// Analytics types
export type {
  DashboardData,
  Meter,
  Metrics,
  TopPerformingData,
  ActiveFilters,
  TimeFrames,
  ChartDataPoint,
  KpiMetric,
  ReportData,
  ReportField,
  ExportDataStructure,
  MachineExportData,
  LocationExportData,
  PerformanceMetrics,
  AnalyticsQuery,
  ActivityLog,
} from "./analytics";

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
  Licensee,
  Location,
  Address,
  RelationshipInfo,
  GeoCoordinates,
  AggregatedLocation,
  Machine,
  MachineDocument,
  User,
  MovementRequest,
  MovementRequestStatus,
  LocationMetrics,
  TopLocation,
} from "./entities";

// Analytics types
export type {
  DashboardData,
  Meter as AnalyticsMeter,
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
  ActivityLog as AnalyticsActivityLog,
} from "./analytics";

// Export types
export type { ExportFormat, ExportData, LegacyExportData } from "./export";

// Report types
export type {
  ReportsLocationData,
  PaginationInfo,
  ReportsLocationsResponse,
} from "./reports";

// Date format types
export type { DateFormatOptions, DateInput } from "./dateFormat";

// Currency types
export type {
  CurrencyCode,
  LICENCEE_DEFAULT_CURRENCY,
  ExchangeRate,
  ExchangeRates,
  CurrencyConversionRequest,
  CurrencyConversionResponse,
  CurrencyFilterState,
  CurrencyMeta,
} from "./currency";

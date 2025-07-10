// UI Component types
import type { ExtendedCabinetDetail } from "./pages";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import type { ButtonProps } from "./componentProps";
import type { MovementRequest } from "@/lib/types/movementRequests";
import type { Licensee } from "@/lib/types/licensee";
import type {
  Location,
  Cabinet,
  Firmware,
  dateRange as DateRange,
} from "@/lib/types";
import type { ICollectionReport as CollectionReport } from "@/lib/types/api";

// Define missing types locally until they are properly exported
export type ActivityLog = {
  _id: string;
  timestamp: Date;
  actor: {
    id: string;
    email: string;
    role: string;
  };
  actionType: string;
  entityType: string;
  entity: {
    id: string;
    name: string;
  };
  changes: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }>;
  description?: string;
  ipAddress?: string;
};

export type SmibConfig = {
  firmwareVersion: string;
  communicationMode: "ethernet" | "wifi" | "cellular";
  networkSettings: NetworkConfig;
  advancedSettings: AdvancedSettings;
};

export type NetworkConfig = {
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dns: string;
};

export type AdvancedSettings = {
  debugMode: boolean;
  logLevel: string;
  maxRetries: number;
  timeout: number;
};

export type BillValidatorData = {
  _id: string;
  denomination: number;
  count: number;
  timestamp: Date;
  machine: string;
};

export type CollectorSchedule = {
  _id: string;
  collector: string;
  location: string;
  startTime: Date;
  endTime: Date;
  status: string;
};

export type ManagerSchedule = {
  _id: string;
  manager: string;
  location: string;
  startTime: Date;
  endTime: Date;
  status: string;
};

export type PaymentStatus = "paid" | "pending" | "overdue" | "failed";

// OnlineOfflineIndicator types
export type LocationMetrics = {
  onlineMachines?: number;
  totalMachines?: number;
};

export type OnlineOfflineIndicatorProps = {
  className?: string;
  showTitle?: boolean;
  size?: "sm" | "md" | "lg";
};

// LiquidGradient types
export type Blob = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: RGBAColor;
};

export type RGBAColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

// Reports component types
export type TemplateData = {
  id: number;
  name: string;
  category: string;
  rating: number;
  uses: number;
  description: string;
  lastUpdated: string;
  author: string;
  sections: string[];
  sampleData: {
    title: string;
    subtitle: string;
    headers: string[];
    data: string[][];
  };
};

export type Option = Record<"value" | "label", string>;

// LocationMap types
export type LocationData = {
  locationId: string;
  locationName: string;
  coordinates?: { lat: number; lng: number };
  metrics: {
    grossRevenue: number;
    totalDrop: number;
    totalCancelledCredits: number;
    actualHoldPercentage: number;
  };
  onlineMachines: number;
  totalMachines: number;
  performance: "excellent" | "good" | "average" | "poor";
  sasEnabled: boolean;
};

export type LocationMapProps = {
  locations: LocationData[];
  selectedLocations?: string[];
  onLocationSelect: (locationId: string) => void;
  compact?: boolean;
};

// Cabinet Details types
export type MachineDoc = {
  _id: string;
  assetNumber: string;
  serialNumber: string;
  manufacturer: string;
  gameTitle: string;
  denomination: number;
  location: {
    _id: string;
    name: string;
  };
  isActive: boolean;
  installDate: Date | string;
  lastMaintenanceDate?: Date | string;
  warrantyExpiry?: Date | string;
  notes?: string;
  gameConfig?: {
    accountingDenomination?: number;
    theoreticalRtp?: number;
    [key: string]: unknown;
  };
  billValidator?: {
    enabled: boolean;
    acceptedDenominations: number[];
  };
  [key: string]: unknown;
};

// Common UI Component Props
export type ButtonVariant = "sync" | "refresh";

export type SyncButtonProps = {
  onClick: () => void;
  isSyncing?: boolean;
  label?: string;
  iconOnly?: boolean;
  variant?: ButtonVariant;
};

export type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  setCurrentPage: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
};

export type PaginationLinkProps = {
  isActive?: boolean;
  size?: Pick<ButtonProps, "size">;
} & React.ComponentProps<"a">;

export type MachineStatusWidgetProps = {
  onlineCount: number;
  offlineCount: number;
};

export type EmptyStateProps = {
  icon: string;
  title: string;
  message: string;
};

export type NoDataMessageProps = {
  message?: string;
  className?: string;
};

export type ChipProps = {
  label: string;
  onRemove?: () => void;
  className?: string;
};

// Movement/Modal Props
export type NewMovementRequestModalProps = {
  isOpen: boolean;
  onClose: () => void;
  locations: { _id: string; name: string }[];
};

export type NewMovementModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MovementRequest) => void;
};

// Firmware Component Props
export type UploadSmibDataModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export type SMIBFirmwareTableProps = {
  firmwares: Firmware[];
  loading?: boolean;
};

export type SMIBFirmwareModalProps = {
  isOpen: boolean;
  onClose: () => void;
  cabinetId?: string;
};

// Chart Component Props
export type SimpleBarChartProps = {
  data: { name: string; value: number }[];
};

export type PerformanceChartProps = {
  data: unknown[];
  height?: number;
};

export type KpiCardProps = {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  color?: string;
};

export type ComparisonChartProps = {
  data: Array<{
    name: string;
    current: number;
    previous: number;
  }>;
  height?: number;
  showLegend?: boolean;
};

// Location Component Props
export type LocationInfoProps = {
  location: Location;
  metrics: LocationMetrics;
  loading?: boolean;
};

export type CabinetCardProps = {
  cabinet: Cabinet;
  onClick?: () => void;
  showMetrics?: boolean;
};

export type TimeFilterButtonsProps = {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  periods: Array<{
    value: string;
    label: string;
  }>;
};

// Cabinet Details Component Props
export type TimePeriodDropdownProps = {
  selectedPeriod: string;
  onPeriodChange: (period: string) => void;
  periods: Array<{
    value: string;
    label: string;
  }>;
};

export type StatusIndicatorProps = {
  status: "online" | "offline" | "maintenance";
  size?: "sm" | "md" | "lg";
};

export type SmibConfigurationProps = {
  cabinetId: string;
  config: SmibConfig;
  onConfigUpdate: (config: SmibConfig) => void;
  loading?: boolean;
};

export type FirmwareUpdateSectionProps = {
  currentVersion: string;
  availableVersions: string[];
  onUpdateFirmware: (version: string) => void;
  updating?: boolean;
};

export type CommunicationModeSectionProps = {
  currentMode: "ethernet" | "wifi" | "cellular";
  onModeChange: (mode: "ethernet" | "wifi" | "cellular") => void;
  networkConfig: NetworkConfig;
  onNetworkConfigChange: (config: NetworkConfig) => void;
};

export type AdvancedSettingsProps = {
  settings: AdvancedSettings;
  onSettingsChange: (settings: AdvancedSettings) => void;
};

export type NetConfig = {
  ipAddress: string;
  subnetMask: string;
  gateway: string;
  dns: string;
};

export type MetricsTabsProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: Array<{
    id: string;
    label: string;
    count?: number;
  }>;
};

export type CabinetInfoHeaderProps = {
  cabinet: Cabinet;
  location: Location;
  showEditButton?: boolean;
  onEdit?: () => void;
};

export type BillValidatorTableProps = {
  bills: BillValidatorData[];
  loading?: boolean;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
};

export type BackButtonHomeProps = Record<string, never>;

export type BackButtonProps = {
  href?: string;
  onClick?: () => void;
  label?: string;
};

export type ActivityLogTableProps = {
  activities: ActivityLog[];
  loading?: boolean;
  onActivityClick?: (activity: ActivityLog) => void;
};

// Administration Component Props
export type UserTableProps = {
  users: unknown[];
  loading?: boolean;
  onUserClick?: (user: unknown) => void;
  onUserEdit?: (user: unknown) => void;
  onUserDelete?: (userId: string) => void;
};

export type UserCardProps = {
  user: unknown;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
};

export type UserActivityLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
};

export type ActivityGroup = {
  date: string;
  activities: ProcessedActivityEntry[];
};

export type ProcessedActivityEntry = {
  id: string;
  time: string;
  action: string;
  details: string;
  status: "success" | "warning" | "error";
};

export type SearchFilterBarProps = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  roleFilter: string;
  onRoleChange: (role: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  availableRoles: string[];
};

export type PaymentStatusConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  licensee: Licensee;
  newStatus: PaymentStatus;
  onConfirm: (licenseeId: string, status: PaymentStatus) => void;
};

export type PaymentHistoryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  licenseeId: string;
  licenseeName: string;
};

export type Payment = {
  id: string;
  amount: number;
  date: string;
  status: PaymentStatus;
  method: string;
  reference: string;
};

export type LicenseeTableProps = {
  licensees: Licensee[];
  loading?: boolean;
  onLicenseeClick?: (licensee: Licensee) => void;
  onLicenseeEdit?: (licensee: Licensee) => void;
  onLicenseeDelete?: (licenseeId: string) => void;
  onPaymentHistoryView?: (licenseeId: string) => void;
};

export type LicenseeSuccessModalProps = {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  type: "success" | "error" | "warning";
};

export type LicenseeSearchBarProps = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  placeholder?: string;
};

export type LicenseeCardProps = {
  licensee: Licensee;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onPaymentHistoryView?: () => void;
  showActions?: boolean;
};

export type EditLicenseeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  licensee: Licensee;
  onSave: (licensee: Licensee) => void;
};

export type DeleteLicenseeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  licensee: Licensee;
  onConfirm: (licenseeId: string) => void;
};

export type AddUserRolesModalProps = {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  currentRoles: string[];
  availableRoles: string[];
  onSave: (userId: string, roles: string[]) => void;
};

export type AddUserDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Partial<unknown>) => void;
  initialData?: Partial<unknown>;
};

export type AddLicenseeModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (licensee: Partial<Licensee>) => void;
};

export type ActivityLogModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityType: string;
};

export type ActivityDetailsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  activity: ActivityLog;
  showFullDetails?: boolean;
};

// Collection Report Component Props
export type MonthlyReportDetailsRow = {
  id: string;
  location: string;
  revenue: number;
  machines: number;
  date: string;
};

export type CollectionReportProps = {
  reports: CollectionReport[];
  loading?: boolean;
  onReportClick?: (reportId: string) => void;
};

export type CollectionReportFiltersProps = {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  locationFilter: string;
  onLocationChange: (location: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  locations: Location[];
};

export type CollectionReportCardsProps = {
  reports: CollectionReport[];
  loading?: boolean;
  onCardClick?: (reportId: string) => void;
};

export type CollectionReportTableProps = {
  reports: CollectionReport[];
  loading?: boolean;
  onRowClick?: (reportId: string) => void;
};

export type CollectorScheduleProps = {
  schedules: CollectorSchedule[];
  isLoading?: boolean;
};

export type ManagerScheduleProps = {
  schedules: ManagerSchedule[];
  isLoading?: boolean;
};

// Location Details Component Props
export type CabinetGridProps = {
  filteredCabinets: ExtendedCabinetDetail[];
  currentPage: number;
  itemsPerPage: number;
  router: AppRouterInstance;
};

export type MetricsSummaryProps = {
  metrics: LocationMetrics;
  loading?: boolean;
};

export type CabinetFilterBarProps = {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  gameFilter: string;
  onGameChange: (game: string) => void;
  availableGames: string[];
};

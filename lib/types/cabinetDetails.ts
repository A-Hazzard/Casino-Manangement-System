import { Cabinet } from "./cabinets";

/**
 * Types for cabinet details functionality
 */

export type MetricsTimeFilter = {
  type: "day" | "week" | "month" | "year" | "custom";
};

export type MetricsTabContent = {
  type: "Range Metrics" | "Day Metrics" | "Week Metrics" | "Month Metrics";
};

export type CabinetDetailsProps = {
  cabinet: Cabinet | null;
  loading: boolean;
  error: string | null;
  metricsLoading: boolean;
  isOnline: boolean;
  isFilterChangeInProgress: boolean;
  setIsFilterChangeInProgress: (value: boolean) => void;
  fetchCabinetDetails: () => Promise<void>;
  updateMetricsData: (filter: MetricsTimeFilter) => Promise<void>;
  lastFilterChangeTimeRef: React.RefObject<number>;
};

export type TimeFilterButtonsProps = {
  activeMetricsFilter: MetricsTimeFilter;
  metricsLoading: boolean;
  isFilterChangeInProgress: boolean;
  lastFilterChangeTimeRef: React.RefObject<number>;
  setIsFilterChangeInProgress: (value: boolean) => void;
  setActiveMetricsFilter: (filter: MetricsTimeFilter) => void;
};

export type TimePeriodDropdownProps = {
  activeMetricsFilter: MetricsTimeFilter;
  metricsLoading: boolean;
  isFilterChangeInProgress: boolean;
  setIsFilterChangeInProgress: (value: boolean) => void;
  setActiveMetricsFilter: (filter: MetricsTimeFilter) => void;
  updateMetricsData: (filter: MetricsTimeFilter) => Promise<void>;
};

export type MetricsTabsProps = {
  activeMetricsTabContent: string;
  setActiveMetricsTabContent: (content: string) => void;
};

export type BackButtonProps = {
  locationName: string;
  handleBackToLocation: () => void;
  hasMounted?: boolean;
};

export type CabinetInfoHeaderProps = {
  cabinet: Cabinet;
  locationName: string;
  openEditModal: (cabinetId: string) => void;
};

export type StatusIndicatorProps = {
  isOnline: boolean;
};

export type SmibConfigurationProps = {
  cabinet: Cabinet;
};

export type AccountingDetailsProps = {
  cabinet: Cabinet;
  metricsLoading: boolean;
  activeMetricsTabContent: string;
  setActiveMetricsTabContent: (content: string) => void;
};

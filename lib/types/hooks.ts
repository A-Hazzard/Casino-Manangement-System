import type { CabinetDetail } from "./cabinets";
import type { TimePeriod } from "./api";
import type { UserAuthPayload } from "./index";

// Frontend-specific hook types
export type UseCabinetDetailsReturn = {
  cabinet: CabinetDetail | null;
  setCabinet: React.Dispatch<React.SetStateAction<CabinetDetail | null>>;
  loading: boolean;
  error: string | null;
  metricsLoading: boolean;
  activeMetricsFilter: TimePeriod;
  isFilterChangeInProgress: boolean;
  changeMetricsFilter: (newFilter: TimePeriod) => void;
  updateMetricsData: () => Promise<void>;
};

export type AuthState = {
  user: UserAuthPayload | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: string) => boolean;
  hasPermission: (permission: string) => boolean;
  hasAnyRole: (roles: string[]) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasLocationAccess: (locationId: string) => boolean;
  getUserLocationIds: () => string[];
  canAccessReport: (requiredRoles?: string[], requiredPermissions?: string[]) => boolean;
}; 
import React from "react";
import { CabinetDetail } from "@/lib/types/cabinets";

// Make TypeScript recognize our hook
declare module "@/lib/hooks/useCabinetDetails" {
  export type UseCabinetDetailsReturn = {
    cabinet: CabinetDetail | null;
    loading: boolean;
    error: string | null;
    metricsLoading: boolean;
    isOnline: boolean;
    isFilterChangeInProgress: boolean;
    setIsFilterChangeInProgress: (state: boolean) => void;
    fetchCabinetDetails: () => Promise<void>;
    updateMetricsData: () => Promise<void | (() => void)>;
    lastFilterChangeTimeRef: React.MutableRefObject<number>;
  };

  export function useCabinetDetails(
    locationId: string,
    cabinetId: string,
    locationName: string
  ): UseCabinetDetailsReturn;

  const hook: typeof useCabinetDetails;
  export default hook;
}

// Make TypeScript recognize our component
declare module "@/components/cabinetDetails/AccountingDetails" {
  import { TimePeriod } from "@/lib/types/cabinets";

  export type AccountingDetailsProps = {
    cabinet: CabinetDetail;
    metricsLoading: boolean;
    activeMetricsTabContent: string;
    setActiveMetricsTabContent: (tab: string) => void;
    activeMetricsFilter?: TimePeriod;
  };

  export const AccountingDetails: React.FC<AccountingDetailsProps>;
  const component: typeof AccountingDetails;
  export default component;
}

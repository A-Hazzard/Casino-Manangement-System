// Allow TypeScript to recognize our hook
declare module "@/lib/hooks/useCabinetDetails" {
  import { CabinetDetail } from "@/lib/types/cabinets";

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

  export default useCabinetDetails;
}

// Allow TypeScript to recognize our component
declare module "@/components/cabinetDetails/AccountingDetails" {
  import { CabinetDetail, TimePeriod } from "@/lib/types/cabinets";

  export type AccountingDetailsProps = {
    cabinet: CabinetDetail;
    loading: boolean;
    activeMetricsTabContent: string;
    setActiveMetricsTabContent: (tab: string) => void;
    activeMetricsFilter?: TimePeriod;
  };

  export const AccountingDetails: React.FC<AccountingDetailsProps>;
  export default AccountingDetails;
}

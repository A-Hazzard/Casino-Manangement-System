// Allow TypeScript to recognize our hook
declare module '@/lib/hooks/useCabinetDetails' {
  import { GamingMachine as CabinetDetail } from '@/shared/types/entities';

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
declare module '@/components/cabinetDetails/AccountingDetails' {
  import {
    GamingMachine as CabinetDetail,
    TimePeriod,
  } from '@/shared/types/entities';

  export type AccountingDetailsProps = {
    cabinet: CabinetDetail;
    loading: boolean;
    activeMetricsTabContent: string;
    setActiveMetricsTabContent: (tab: string) => void;
    activeMetricsFilter?: TimePeriod;
    disableCurrencyConversion?: boolean; // For specific cabinet pages
  };

  export const AccountingDetails: React.FC<AccountingDetailsProps>;
  export default AccountingDetails;
}

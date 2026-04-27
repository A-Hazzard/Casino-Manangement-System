declare module '@/lib/hooks/useCabinetDetails' {
  import { MutableRefObject } from 'react';
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
    lastFilterChangeTimeRef: MutableRefObject<number>;
  };

  export function useCabinetDetails(
    locationId: string,
    cabinetId: string,
    locationName: string
  ): UseCabinetDetailsReturn;

  export default useCabinetDetails;
}

declare module '@/components/cabinetDetails/AccountingDetails' {
  import { FC } from 'react';
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
    disableCurrencyConversion?: boolean;
    onDataRefresh?: () => Promise<void>;
  };

  export const AccountingDetails: FC<AccountingDetailsProps>;
  export default AccountingDetails;
}

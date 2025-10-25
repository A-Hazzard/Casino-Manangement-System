import type { AggregatedLocation } from '@/shared/types/common';

export type UseLocationModalsReturn = {
  isNewLocationModalOpen: boolean;
  openNewLocationModal: () => void;
  closeNewLocationModal: () => void;
  handleLocationClick: (locationId: string) => void;
  handleTableAction: (
    action: 'edit' | 'delete',
    location: AggregatedLocation
  ) => void;
};

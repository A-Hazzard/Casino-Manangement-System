/**
 * Location Modals Types
 * Types for location modal management (create, edit, delete).
 *
 * Manages modal states and handlers for location operations
 * including table actions and navigation.
 */
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

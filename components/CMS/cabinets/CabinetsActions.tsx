/**
 * Cabinets Actions Component
 *
 * Displays action buttons in the page header for creating new cabinets
 * and movement requests. Shows different actions based on the active tab.
 *
 * Features:
 * - New Cabinet button (for cabinets tab)
 * - New Movement Request button (for movement tab)
 * - Responsive design (full buttons on desktop, icons on mobile)
 * - Loading state with skeleton buttons
 */

import { Button } from '@/components/shared/ui/button';
import { ActionButtonSkeleton } from '@/components/shared/ui/skeletons/ButtonSkeletons';
import { useNewCabinetStore } from '@/lib/store/newCabinetStore';
import { useUserStore } from '@/lib/store/userStore';
import { PlusCircle } from 'lucide-react';
import { useCallback, useMemo } from 'react';

type CabinetsActionsProps = {
  activeSection: string;
  selectedLocation: string | string[];
  locations: { _id: string; name: string }[];
  onMovementRequestClick: () => void;
  onCabinetCreated: () => void;
  onCabinetUpdated: () => void;
  onCabinetDeleted: () => void;
  loading?: boolean;
};

export const CabinetsActions = ({
  activeSection,
  selectedLocation,
  onMovementRequestClick,
  loading = false,
}: CabinetsActionsProps) => {
  const { openCabinetModal } = useNewCabinetStore();
  const user = useUserStore(state => state.user);

  const canCreateCabinet = useMemo(() => {
    const roles = user?.roles ?? [];
    return ['developer', 'admin', 'technician'].some(role => roles.includes(role));
  }, [user]);

  const handleNewCabinet = useCallback(() => {
    // If selectedLocation is an array, pick the first one for pre-filling the modal
    const locationId = Array.isArray(selectedLocation)
      ? selectedLocation.length > 0 && selectedLocation[0] !== 'all'
        ? selectedLocation[0]
        : undefined
      : selectedLocation !== 'all'
        ? selectedLocation
        : undefined;
    openCabinetModal(locationId);
  }, [selectedLocation, openCabinetModal]);

  const handleNewMovementRequest = useCallback(() => {
    onMovementRequestClick();
  }, [onMovementRequestClick]);

  /**
   * Renders action buttons
   * Responsive: smaller on mobile, full size on desktop
   */
  const renderActions = () => {
    if (activeSection === 'cabinets') {
      if (!canCreateCabinet) return null;
      return (
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={handleNewCabinet}
            className="bg-button hover:bg-buttonActive text-white rounded-md items-center gap-1 flex-shrink-0 px-2 py-1 text-xs font-medium sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            title="Create new cabinet"
          >
            <PlusCircle className="h-4 w-4" />
            <span className="hidden sm:inline">Create new cabinet</span>
            <span className="sm:hidden">Create</span>
          </Button>
        </div>
      );
    }

    if (activeSection === 'movement') {
      return (
        <div className="flex items-center gap-2 flex-shrink-0">
          {loading ? (
            <ActionButtonSkeleton width="w-32 sm:w-48" showIcon={true} />
          ) : (
            <Button
              onClick={handleNewMovementRequest}
              className="bg-button hover:bg-buttonActive text-white rounded-md items-center gap-1 flex-shrink-0 px-2 py-1 text-xs font-medium sm:gap-2 sm:px-4 sm:py-2 sm:text-sm"
            >
              <PlusCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Create Movement Request</span>
              <span className="sm:hidden">Create</span>
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderActions()}
    </>
  );
};


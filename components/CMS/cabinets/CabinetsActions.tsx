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
import { PlusCircle } from 'lucide-react';
import { useCallback } from 'react';

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
   * Renders action buttons for desktop view
   * Shows full button text with icons
   */
  const renderDesktopActions = () => {
    if (activeSection === 'cabinets') {
      return (
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {loading ? (
            <ActionButtonSkeleton width="w-36" showIcon={true} />
          ) : (
            <Button
              onClick={handleNewCabinet}
              className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
              title="Add Cabinet"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Add Cabinet</span>
            </Button>
          )}
        </div>
      );
    }

    if (activeSection === 'movement') {
      return (
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          {loading ? (
            <ActionButtonSkeleton width="w-48" showIcon={true} />
          ) : (
            <Button
              onClick={handleNewMovementRequest}
              className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
            >
              <PlusCircle className="h-4 w-4" />
              <span>Create Movement Request</span>
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  /**
   * Renders action buttons for mobile view
   * Shows icon-only buttons to save space
   */
  const renderMobileActions = () => {
    if (activeSection === 'cabinets') {
      return (
        <div className="md:hidden">
          {loading ? (
            <div className="h-5 w-5 flex-shrink-0" />
          ) : (
            <button
              onClick={handleNewCabinet}
              disabled={loading}
              className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Add Cabinet"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          )}
        </div>
      );
    }

    if (activeSection === 'movement') {
      return (
        <div className="md:hidden">
          {loading ? (
            <div className="h-5 w-5 flex-shrink-0" />
          ) : (
            <button
              onClick={handleNewMovementRequest}
              disabled={loading}
              className="p-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              aria-label="Create Movement Request"
            >
              <PlusCircle className="h-5 w-5 text-green-600 hover:text-green-700" />
            </button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderDesktopActions()}
      {renderMobileActions()}
    </>
  );
};


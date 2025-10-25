/**
 * Cabinet Actions Component
 * Handles cabinet CRUD operations and modal management
 */

import { useCallback } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNewCabinetStore } from '@/lib/store/newCabinetStore';
import { ActionButtonSkeleton } from '@/components/ui/skeletons/ButtonSkeletons';
type CabinetActionsProps = {
  activeSection: string;
  selectedLocation: string;
  locations: { _id: string; name: string }[];
  onMovementRequestClick: () => void;
  onCabinetCreated: () => void;
  onCabinetUpdated: () => void;
  onCabinetDeleted: () => void;
  loading?: boolean;
};

export const CabinetActions = ({
  activeSection,
  selectedLocation,
  onMovementRequestClick,
  loading = false,
}: CabinetActionsProps) => {
  const { openCabinetModal } = useNewCabinetStore();

  // Handle new cabinet creation
  const handleNewCabinet = useCallback(() => {
    const locationId =
      selectedLocation !== 'all' ? selectedLocation : undefined;
    openCabinetModal(locationId);
  }, [selectedLocation, openCabinetModal]);

  // Handle movement request creation
  const handleNewMovementRequest = useCallback(() => {
    onMovementRequestClick();
  }, [onMovementRequestClick]);

  // Render desktop header action buttons
  const renderDesktopActions = () => {
    if (activeSection === 'cabinets') {
      return (
        <div className="hidden flex-shrink-0 items-center gap-3 md:flex">
          {loading ? (
            <ActionButtonSkeleton width="w-36" showIcon={true} />
          ) : (
            <Button
              onClick={handleNewCabinet}
              className="flex-shrink-0 items-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive"
              title="Add Cabinet"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <span>Add Cabinet</span>
            </Button>
          )}
        </div>
      );
    }

    if (activeSection === 'movement') {
      return (
        <div className="hidden flex-shrink-0 items-center gap-3 md:flex">
          {loading ? (
            <ActionButtonSkeleton width="w-48" showIcon={true} />
          ) : (
            <Button
              onClick={handleNewMovementRequest}
              className="flex-shrink-0 items-center gap-2 rounded-md bg-button px-4 py-2 text-white hover:bg-buttonActive"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white">
                <Plus className="h-4 w-4 text-white" />
              </div>
              <span>Create Movement Request</span>
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  // Render mobile action buttons
  const renderMobileActions = () => {
    if (activeSection === 'cabinets') {
      return (
        <div className="mt-4 w-full md:hidden">
          {loading ? (
            <ActionButtonSkeleton width="w-full" showIcon={true} />
          ) : (
            <Button
              onClick={handleNewCabinet}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-button py-3 text-white hover:bg-buttonActive"
              title="Add Cabinet"
            >
              <Plus size={20} />
              Add Cabinet
            </Button>
          )}
        </div>
      );
    }

    if (activeSection === 'movement') {
      return (
        <div className="mt-4 w-full md:hidden">
          {loading ? (
            <ActionButtonSkeleton width="w-full" showIcon={true} />
          ) : (
            <Button
              onClick={handleNewMovementRequest}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-button py-3 text-white hover:bg-buttonActive"
            >
              <Plus size={20} />
              Create Movement Request
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Desktop Actions */}
      {renderDesktopActions()}

      {/* Mobile Actions */}
      {renderMobileActions()}
    </>
  );
};

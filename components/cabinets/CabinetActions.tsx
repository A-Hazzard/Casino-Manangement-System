/**
 * Cabinet Actions Component
 * Handles cabinet CRUD operations and modal management
 */

import { useCallback } from "react";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNewCabinetStore } from "@/lib/store/newCabinetStore";
import { ActionButtonSkeleton } from "@/components/ui/skeletons/ButtonSkeletons";
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
      selectedLocation !== "all" ? selectedLocation : undefined;
    openCabinetModal(locationId);
  }, [selectedLocation, openCabinetModal]);

  // Handle movement request creation
  const handleNewMovementRequest = useCallback(() => {
    onMovementRequestClick();
  }, [onMovementRequestClick]);

  // Render desktop header action buttons
  const renderDesktopActions = () => {
    if (activeSection === "cabinets") {
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

    if (activeSection === "movement") {
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

  // Render mobile action buttons - icons only
  const renderMobileActions = () => {
    if (activeSection === "cabinets") {
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

    if (activeSection === "movement") {
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
      {/* Desktop Actions */}
      {renderDesktopActions()}

      {/* Mobile Actions */}
      {renderMobileActions()}
    </>
  );
};

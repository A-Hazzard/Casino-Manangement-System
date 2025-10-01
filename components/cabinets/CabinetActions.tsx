/**
 * Cabinet Actions Component
 * Handles cabinet CRUD operations and modal management
 */

import { useCallback } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNewCabinetStore } from "@/lib/store/newCabinetStore";

interface CabinetActionsProps {
  activeSection: string;
  selectedLocation: string;
  locations: { _id: string; name: string }[];
  onMovementRequestClick: () => void;
  onCabinetCreated: () => void;
  onCabinetUpdated: () => void;
  onCabinetDeleted: () => void;
}

export const CabinetActions = ({
  activeSection,
  selectedLocation,
  onMovementRequestClick,
}: CabinetActionsProps) => {
  const { openCabinetModal } = useNewCabinetStore();



  // Handle new cabinet creation
  const handleNewCabinet = useCallback(() => {
    const locationId = selectedLocation !== "all" ? selectedLocation : undefined;
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
          <Button
            onClick={handleNewCabinet}
            className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
            title="Add Cabinet"
          >
            <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span>Add Cabinet</span>
          </Button>
        </div>
      );
    }

    if (activeSection === "movement") {
      return (
        <div className="hidden md:flex items-center gap-3 flex-shrink-0">
          <Button
            onClick={handleNewMovementRequest}
            className="bg-button hover:bg-buttonActive text-white px-4 py-2 rounded-md items-center gap-2 flex-shrink-0"
          >
            <div className="flex items-center justify-center w-6 h-6 border-2 border-white rounded-full">
              <Plus className="w-4 h-4 text-white" />
            </div>
            <span>Create Movement Request</span>
          </Button>
        </div>
      );
    }

    return null;
  };

  // Render mobile action buttons
  const renderMobileActions = () => {
    if (activeSection === "cabinets") {
      return (
        <div className="md:hidden mt-4 w-full">
          <Button
            onClick={handleNewCabinet}
            className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
            title="Add Cabinet"
          >
            <Plus size={20} />
            Add Cabinet
          </Button>
        </div>
      );
    }

    if (activeSection === "movement") {
      return (
        <div className="md:hidden mt-4 w-full">
          <Button
            onClick={handleNewMovementRequest}
            className="w-full bg-button hover:bg-buttonActive text-white py-3 rounded-lg flex items-center justify-center gap-2"
          >
            <Plus size={20} />
            Create Movement Request
          </Button>
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

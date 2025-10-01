/**
 * Cabinet Content Display Component
 * Handles the main content display for cabinets section including table and card views
 */

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import CabinetCard from "@/components/ui/cabinets/CabinetCard";
import CabinetTable from "@/components/ui/cabinets/CabinetTable";
import { NetworkError } from "@/components/ui/errors";
import ClientOnly from "@/components/ui/common/ClientOnly";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import type { GamingMachine as Cabinet } from "@/shared/types/entities";
import type { CabinetSortOption } from "@/lib/hooks/data";
import { CabinetTableSkeleton } from "@/components/ui/cabinets/CabinetSkeletonLoader";

interface CabinetContentDisplayProps {
  // Data
  paginatedCabinets: Cabinet[];
  filteredCabinets: Cabinet[];
  allCabinets: Cabinet[];
  
  // Loading and error states
  initialLoading: boolean;
  loading: boolean;
  error: string | null;
  
  // Sort and pagination
  sortOption: CabinetSortOption;
  sortOrder: "asc" | "desc";
  currentPage: number;
  totalPages: number;
  
  // Actions
  onSort: (column: CabinetSortOption) => void;
  onPageChange: (page: number) => void;
  onEdit: (cabinet: Cabinet) => void;
  onDelete: (cabinet: Cabinet) => void;
  onRetry: () => void;
  transformCabinet: (cabinet: Cabinet) => Cabinet;
}

export const CabinetContentDisplay = ({
  paginatedCabinets,
  filteredCabinets,
  allCabinets,
  initialLoading,
  loading,
  error,
  sortOption,
  sortOrder,
  currentPage,
  totalPages,
  onSort,
  onPageChange,
  onEdit,
  onDelete,
  onRetry,
  transformCabinet,
}: CabinetContentDisplayProps) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // No data message component
  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-md">
      <div className="text-gray-500 text-lg mb-2">No Data Available</div>
      <div className="text-gray-400 text-sm text-center">{message}</div>
    </div>
  );

  // Handle edit action with proper cabinet lookup
  const handleEdit = (cabinetProps: Cabinet) => {
    const cabinet = paginatedCabinets.find((c) => c._id === cabinetProps._id);
    if (cabinet) {
      openEditModal(cabinet);
    }
  };

  // Handle delete action with proper cabinet lookup
  const handleDelete = (cabinetProps: Cabinet) => {
    const cabinet = paginatedCabinets.find((c) => c._id === cabinetProps._id);
    if (cabinet) {
      openDeleteModal(cabinet);
    }
  };

  // Handle page number input change
  const handlePageNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    let pageNumber = Number(event.target.value);
    if (isNaN(pageNumber)) pageNumber = 1;
    if (pageNumber < 1) pageNumber = 1;
    if (pageNumber > totalPages) pageNumber = totalPages;
    
    onPageChange(pageNumber - 1);
  };

  // Render error state
  if (error) {
    return (
      <NetworkError
        title="Failed to Load Cabinets"
        message="Unable to load cabinet data. Please check your connection and try again."
        onRetry={onRetry}
        isRetrying={loading}
        errorDetails={error}
      />
    );
  }

  // Render loading state
  if (initialLoading || loading) {
    return (
      <>
        {/* Table Skeleton for large screens */}
        <div className="hidden md:block">
          <ClientOnly fallback={<CabinetTableSkeleton />}>
            <CabinetTableSkeleton />
          </ClientOnly>
        </div>

        {/* Card Skeleton for small screens */}
        <div className="block md:hidden">
          <ClientOnly fallback={<CabinetTableSkeleton />}>
            <CabinetTableSkeleton />
          </ClientOnly>
        </div>
      </>
    );
  }

  // Render no data state
  if (filteredCabinets.length === 0) {
    return (
      <div className="mt-6">
        <NoDataMessage
          message={
            filteredCabinets.length === 0 && allCabinets.length > 0
              ? "No cabinets match your search criteria."
              : "No cabinets available. Click 'Add New Cabinet' to add one."
          }
        />
      </div>
    );
  }

  // Render main content
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block" ref={tableRef}>
        <CabinetTable
          data={paginatedCabinets.map(transformCabinet)}
          loading={loading}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={(column: string) => onSort(column as CabinetSortOption)}
          onPageChange={onPageChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Mobile Card View */}
      <div
        className="block md:hidden mt-4 px-1 sm:px-2 space-y-3 sm:space-y-4 w-full max-w-full"
        ref={cardsRef}
      >
        <ClientOnly fallback={<CabinetTableSkeleton />}>
          {paginatedCabinets.map((cabinet) => (
            <CabinetCard
              key={cabinet._id}
              _id={cabinet._id}
              assetNumber={cabinet.assetNumber || ""}
              game={cabinet.game || ""}
              smbId={
                cabinet.smbId ||
                cabinet.smibBoard ||
                cabinet.relayId ||
                ""
              }
              serialNumber={getSerialNumberIdentifier(cabinet)}
              locationId={cabinet.locationId || ""}
              locationName={cabinet.locationName || ""}
              moneyIn={cabinet.moneyIn || 0}
              moneyOut={cabinet.moneyOut || 0}
              cancelledCredits={cabinet.moneyOut || 0}
              jackpot={cabinet.jackpot || 0}
              gross={cabinet.gross || 0}
              lastOnline={
                cabinet.lastOnline instanceof Date
                  ? cabinet.lastOnline.toISOString()
                  : typeof cabinet.lastOnline === "string"
                  ? cabinet.lastOnline
                  : undefined
              }
              installedGame={
                cabinet.installedGame || cabinet.game || ""
              }
              onEdit={() => onEdit(cabinet)}
              onDelete={() => onDelete(cabinet)}
            />
          ))}
        </ClientOnly>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(0)}
            disabled={currentPage === 0}
            className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
          >
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-gray-700 text-sm">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage + 1}
            onChange={handlePageNumberChange}
            className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
            aria-label="Page number"
          />
          <span className="text-gray-700 text-sm">
            of {totalPages}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage === totalPages - 1}
            className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage === totalPages - 1}
            className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
          >
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
};

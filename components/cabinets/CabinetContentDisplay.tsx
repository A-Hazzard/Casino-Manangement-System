/**
 * Machine Content Display Component
 * Handles the main content display for machines section including table and card views
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from '@radix-ui/react-icons';
import CabinetCard from '@/components/ui/cabinets/CabinetCard';
import CabinetTable from '@/components/ui/cabinets/CabinetTable';
import { NetworkError } from '@/components/ui/errors';
import ClientOnly from '@/components/ui/common/ClientOnly';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { CabinetTableSkeleton } from '@/components/ui/cabinets/CabinetSkeletonLoader';
import CabinetCardSkeleton from '@/components/ui/cabinets/CabinetCardSkeleton';
import type { GamingMachine as Machine } from '@/shared/types/entities';
import type { CabinetSortOption } from '@/lib/hooks/data';

type CabinetContentDisplayProps = {
  paginatedCabinets: Machine[];
  filteredCabinets: Machine[];
  allCabinets: Machine[];
  initialLoading: boolean;
  loading: boolean;
  error: string | null;
  sortOption: CabinetSortOption;
  sortOrder: 'asc' | 'desc';
  currentPage: number;
  totalPages: number;
  onSort: (column: CabinetSortOption) => void;
  onPageChange: (page: number) => void;
  onEdit: (machine: Machine) => void;
  onDelete: (machine: Machine) => void;
  onRetry: () => void;
  transformCabinet: (cabinet: Machine) => Machine;
};

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
    <div className="flex flex-col items-center justify-center rounded-lg bg-white p-8 shadow-md">
      <div className="mb-2 text-lg text-gray-500">No Data Available</div>
      <div className="text-center text-sm text-gray-400">{message}</div>
    </div>
  );

  // Handle edit action with proper machine lookup
  const handleEdit = (machineProps: Machine) => {
    const machine = paginatedCabinets.find(c => c._id === machineProps._id);
    if (machine) {
      openEditModal(machine);
    }
  };

  // Handle delete action with proper machine lookup
  const handleDelete = (machineProps: Machine) => {
    const machine = paginatedCabinets.find(c => c._id === machineProps._id);
    if (machine) {
      openDeleteModal(machine);
    }
  };

  // Handle page number input change
  const handlePageNumberChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
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
        title="Failed to Load Machines"
        message="Unable to load machine data. Please check your connection and try again."
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
          <ClientOnly fallback={<CabinetCardSkeleton />}>
            <CabinetCardSkeleton />
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
              ? 'No machines match your search criteria.'
              : "No machines available. Click 'Add New Machine' to add one."
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
        className="mt-4 block w-full max-w-full space-y-3 px-1 sm:space-y-4 sm:px-2 md:hidden"
        ref={cardsRef}
      >
        <ClientOnly fallback={<CabinetTableSkeleton />}>
          {paginatedCabinets.map(machine => (
            <CabinetCard
              key={machine._id}
              _id={machine._id}
              assetNumber={machine.assetNumber || ''}
              game={machine.game || ''}
              smbId={
                machine.relayId || machine.smbId || machine.smibBoard || ''
              }
              serialNumber={getSerialNumberIdentifier(machine)}
              locationId={machine.locationId || ''}
              locationName={machine.locationName || ''}
              moneyIn={machine.moneyIn || 0}
              moneyOut={machine.moneyOut || 0}
              cancelledCredits={machine.moneyOut || 0}
              jackpot={machine.jackpot || 0}
              gross={machine.gross || 0}
              lastOnline={
                machine.lastOnline instanceof Date
                  ? machine.lastOnline.toISOString()
                  : typeof machine.lastOnline === 'string'
                    ? machine.lastOnline
                    : undefined
              }
              installedGame={machine.installedGame || machine.game || ''}
              onEdit={() => onEdit(machine)}
              onDelete={() => onDelete(machine)}
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
            className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          >
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm text-gray-700">Page</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage + 1}
            onChange={handlePageNumberChange}
            className="w-16 rounded border border-gray-300 px-2 py-1 text-center text-sm text-gray-700 focus:border-buttonActive focus:ring-buttonActive"
            aria-label="Page number"
          />
          <span className="text-sm text-gray-700">of {totalPages}</span>
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              onPageChange(Math.min(totalPages - 1, currentPage + 1))
            }
            disabled={currentPage === totalPages - 1}
            className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages - 1)}
            disabled={currentPage === totalPages - 1}
            className="border-button bg-white p-2 text-button hover:bg-button/10 disabled:border-gray-300 disabled:text-gray-400 disabled:opacity-50"
          >
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
};

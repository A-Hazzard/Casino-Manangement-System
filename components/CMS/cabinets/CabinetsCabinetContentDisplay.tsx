/**
 * Cabinets Cabinet Content Display Component
 *
 * Main component for displaying the list of cabinets/machines.
 * Handles both desktop table view and mobile card view with proper
 * loading states, error handling, and pagination.
 *
 * Features:
 * - Responsive design (table on desktop, cards on mobile)
 * - Loading skeletons for both views
 * - Error state with retry functionality
 * - Empty state with contextual messages
 * - Pagination controls
 * - Edit/delete actions with permission checks
 * - Row/card animations on data changes
 */

import { Button } from '@/components/shared/ui/button';
import ClientOnly from '@/components/shared/ui/common/ClientOnly';
import { NetworkError } from '@/components/shared/ui/errors';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import { fetchLicencees } from '@/lib/helpers/client';
import type { CabinetSortOption } from '@/lib/hooks/data';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import { getLicenceeName } from '@/lib/utils/licencee';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { animateCards, animateTableRows } from '@/lib/utils/ui';
import type { GamingMachine as Machine } from '@/shared/types/entities';
import { useEffect, useMemo, useRef, useState } from 'react';
import CabinetsCabinetCard from './CabinetsCabinetCard';
import CabinetsCabinetCardSkeleton from './CabinetsCabinetCardSkeleton';
import CabinetsCabinetTable from './CabinetsCabinetTable';
import CabinetsCabinetTableSkeleton from './CabinetsCabinetTableSkeleton';

type CabinetsCabinetContentDisplayProps = {
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
  onEdit?: (machine: Machine) => void;
  onDelete?: (machine: Machine) => void;
  onRetry: () => void;
  transformCabinet: (cabinet: Machine) => Machine;
  selectedLicencee?: string;
  totalCount?: number;
  /**
   * When false, disable header click sorting in the table.
   * Useful for pages that provide separate sort controls.
   */
  enableHeaderSorting?: boolean;
  /**
   * When false, hide the sort direction icons in the table header.
   */
  showSortIcons?: boolean;
  showNetGross?: boolean;
};

export const CabinetsCabinetContentDisplay = ({
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
  onRetry,
  transformCabinet,
  selectedLicencee = 'all',
  enableHeaderSorting = true,
  showSortIcons = true,
  totalCount,
  showNetGross = true,
}: CabinetsCabinetContentDisplayProps) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { openEditModal, openDeleteModal } = useCabinetsActionsStore();
  const user = useUserStore(state => state.user);
  const licenceeName =
    getLicenceeName(selectedLicencee) || selectedLicencee || 'any licencee';

  /**
   * Determines if the user can edit machines.
   * Technicians can edit but not delete, collectors cannot edit or delete.
   */
  const canEditMachines = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Collectors cannot edit machines
    if (userRoles.includes('collector')) {
      return false;
    }
    // Technicians, managers, admins, developers, and location admins can edit
    return [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
    ].some(role => userRoles.includes(role));
  }, [user]);

  /**
   * Determines if the user can delete machines.
   * Only managers, admins, developers, and location admins can delete.
   * Only collectors cannot delete.
   */
  const canDeleteMachines = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Collectors cannot delete machines
    if (userRoles.includes('collector')) {
      return false;
    }
    // Admins, developers, managers, location admins, and technicians can delete
    return ['developer', 'admin', 'manager', 'location admin', 'technician'].some(role =>
      userRoles.includes(role)
    );
  }, [user]);

  const shouldHideFinancials = useMemo(() => {
    return false;
  }, []);

  const [licenceeNames, setLicenceeNames] = useState<string[]>([]);

  /**
   * Fetches licencee names for better empty state messaging
   */
  useEffect(() => {
    const loadLicenceeNames = async () => {
      // Use only new field
      let userLicencees: string[] = [];
      if (
        Array.isArray(user?.assignedLicencees) &&
        user.assignedLicencees.length > 0
      ) {
        userLicencees = user.assignedLicencees;
      }

      if (userLicencees.length > 0) {
        const result = await fetchLicencees();
        const allLicencees = Array.isArray(result.licencees)
          ? result.licencees
          : [];
        const names = userLicencees
          .map(id => {
            const licencee = allLicencees.find(
              l => String(l._id) === String(id)
            );
            return licencee?.name;
          })
          .filter((name): name is string => name !== undefined);
        setLicenceeNames(names);
      }
    };
    loadLicenceeNames();
  }, [user]);

  /**
   * Animates table rows and cards when data changes
   * Triggers on filtering, sorting, or pagination
   */
  useEffect(() => {
    if (!loading && !initialLoading && paginatedCabinets.length > 0) {
      // Animate table rows for desktop view
      if (tableRef.current) {
        animateTableRows(tableRef);
      }
      // Animate cards for mobile view
      if (cardsRef.current) {
        animateCards(cardsRef);
      }
    }
  }, [paginatedCabinets, loading, initialLoading]);

  const NoDataMessage = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center rounded-lg bg-white p-8 shadow-md">
      <div className="mb-2 text-lg text-gray-500">No Data Available</div>
      <div className="text-center text-sm text-gray-400">{message}</div>
    </div>
  );

  const handleEdit = (machineProps: Machine) => {
    const machine = paginatedCabinets.find(c => c._id === machineProps._id);
    if (machine) {
      openEditModal(machine);
    }
  };

  const handleDelete = (machineProps: Machine) => {
    const machine = paginatedCabinets.find(c => c._id === machineProps._id);
    if (machine) {
      openDeleteModal(machine);
    }
  };

  // Use a small delay for the "No Data" message to prevent flashing during fast transitions
  // Hooks must be called unconditionally before any early returns.
  const [showNoDataState, setShowNoDataState] = useState(false);
  const shouldShowSkeleton = initialLoading || loading;

  useEffect(() => {
    // If we're loading or have machines, don't show the "No Data" state
    if (shouldShowSkeleton || filteredCabinets.length > 0) {
      setShowNoDataState(false);
      return;
    }

    // Delay showing the "No Data Available" message to bridge micro-transient states
    const timer = setTimeout(() => {
      setShowNoDataState(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [shouldShowSkeleton, filteredCabinets.length]);

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

  if (shouldShowSkeleton) {
    return (
      <>
        {/* Desktop: Table Skeleton */}
        <div className="hidden lg:block">
          <ClientOnly fallback={<CabinetsCabinetTableSkeleton />}>
            <CabinetsCabinetTableSkeleton />
          </ClientOnly>
        </div>

        {/* Mobile: Card Skeleton */}
        <div className="block lg:hidden">
          <ClientOnly fallback={<CabinetsCabinetCardSkeleton />}>
            <CabinetsCabinetCardSkeleton />
          </ClientOnly>
        </div>
      </>
    );
  }

  // Only show "No Data Available" when NOT loading, NO data, AND the delay has passed
  if (showNoDataState && filteredCabinets.length === 0) {
    console.warn('[CABINET DISPLAY] Displaying No Data message', {
      filteredCabinetsLength: filteredCabinets.length,
      allCabinetsLength: allCabinets.length,
      loading,
      error,
    });

    let emptyMessage = '';
    const isAdmin =
      user?.roles?.includes('admin') || user?.roles?.includes('developer');

    if (filteredCabinets.length === 0 && allCabinets.length > 0) {
      emptyMessage = 'No machines match your search criteria.';
    } else if (allCabinets.length === 0) {
      if (isAdmin) {
        emptyMessage =
          selectedLicencee &&
          selectedLicencee !== 'all' &&
          selectedLicencee !== ''
            ? `No machines found for ${licenceeName}.`
            : 'No machines found in the system.';
      } else if (licenceeNames.length > 0) {
        const licenceeList = licenceeNames.join(', ');
        emptyMessage = `No machines found in your allowed locations for ${licenceeList}.`;
      } else {
        emptyMessage = 'No machines found in your allowed locations.';
      }
    } else {
      emptyMessage = `No machines found for ${selectedLicencee === 'all' ? 'any licencee' : licenceeName}.`;
    }

    return (
      <div className="mt-6">
        <NoDataMessage message={emptyMessage} />
        {/* Only show retry if there was an actual error or if data is truly missing after load */}
        {(error || allCabinets.length === 0) && (
          <div className="mt-4 text-center">
            <Button onClick={onRetry} variant="outline">
              {error ? 'Retry Loading' : 'Refresh Data'}
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Desktop: Table View */}
      <div className="hidden lg:block" ref={tableRef}>
        <CabinetsCabinetTable
          data={paginatedCabinets.map(transformCabinet)}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={(column: string) => onSort(column as CabinetSortOption)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          canEditMachines={canEditMachines}
          canDeleteMachines={canDeleteMachines}
          enableHeaderSorting={enableHeaderSorting}
          showSortIcons={showSortIcons}
          hideFinancials={shouldHideFinancials}
          showNetGross={showNetGross}
        />
      </div>

      {/* Mobile/Tablet: Card View */}
      <div className="mt-4 block lg:hidden" ref={cardsRef}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ClientOnly fallback={<CabinetsCabinetTableSkeleton />}>
            {paginatedCabinets.map(machine => (
              <CabinetsCabinetCard
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
                netGross={machine.netGross}
                network={machine.network}
                lastOnline={
                  machine.lastOnline instanceof Date
                    ? machine.lastOnline.toISOString()
                    : typeof machine.lastOnline === 'string'
                      ? machine.lastOnline
                      : undefined
                }
                installedGame={machine.installedGame || machine.game || ''}
                custom={machine.custom}
                online={machine.online}
                offlineTimeLabel={machine.offlineTimeLabel}
                actualOfflineTime={machine.actualOfflineTime}
                onEdit={() => handleEdit(machine)}
                onDelete={() => handleDelete(machine)}
                canEditMachines={canEditMachines}
                canDeleteMachines={canDeleteMachines}
                hideFinancials={shouldHideFinancials}
                showNetGross={showNetGross}
              />
            ))}
          </ClientOnly>
        </div>
      </div>

      {/* Pagination */}
      {!loading && paginatedCabinets.length > 0 && totalPages > 1 && (
        <div className="mb-8 mt-8 flex w-full justify-center">
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            totalCount={totalCount}
            limit={10}
            showTotalCount={false}
            setCurrentPage={onPageChange}
          />
        </div>
      )}
    </>
  );
};

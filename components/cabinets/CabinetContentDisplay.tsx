/**
 * Cabinet Content Display Component
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

import { Button } from '@/components/ui/button';
import CabinetCard from '@/components/ui/cabinets/CabinetCard';
import CabinetCardSkeleton from '@/components/ui/cabinets/CabinetCardSkeleton';
import { CabinetTableSkeleton } from '@/components/ui/cabinets/CabinetSkeletonLoader';
import CabinetTable from '@/components/ui/cabinets/CabinetTable';
import ClientOnly from '@/components/ui/common/ClientOnly';
import { NetworkError } from '@/components/ui/errors';
import PaginationControls from '@/components/ui/PaginationControls';
import { fetchLicensees } from '@/lib/helpers/clientLicensees';
import type { CabinetSortOption } from '@/lib/hooks/data';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import { getLicenseeName } from '@/lib/utils/licenseeMapping';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import { animateCards, animateTableRows } from '@/lib/utils/ui';
import type { GamingMachine as Machine } from '@/shared/types/entities';
import { useEffect, useMemo, useRef, useState } from 'react';

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
  onEdit?: (machine: Machine) => void;
  onDelete?: (machine: Machine) => void;
  onRetry: () => void;
  transformCabinet: (cabinet: Machine) => Machine;
  selectedLicencee?: string;
  /**
   * When false, disable header click sorting in the table.
   * Useful for pages that provide separate sort controls.
   */
  enableHeaderSorting?: boolean;
  /**
   * When false, hide the sort direction icons in the table header.
   */
  showSortIcons?: boolean;
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
  onRetry,
  transformCabinet,
  selectedLicencee = 'all',
  enableHeaderSorting = true,
  showSortIcons = true,
}: CabinetContentDisplayProps) => {
  const tableRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLDivElement>(null);
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();
  const user = useUserStore(state => state.user);
  const licenseeName =
    getLicenseeName(selectedLicencee) || selectedLicencee || 'any licensee';

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
   * Technicians and collectors cannot delete.
   */
  const canDeleteMachines = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Collectors and technicians cannot delete machines
    if (userRoles.includes('collector') || userRoles.includes('technician')) {
      return false;
    }
    // Only managers, admins, developers, and location admins can delete
    return ['developer', 'admin', 'manager', 'location admin'].some(role =>
      userRoles.includes(role)
    );
  }, [user]);

  const [licenseeNames, setLicenseeNames] = useState<string[]>([]);

  /**
   * Fetches licensee names for better empty state messaging
   */
  useEffect(() => {
    const loadLicenseeNames = async () => {
      // Use only new field
      let userLicensees: string[] = [];
      if (
        Array.isArray(user?.assignedLicensees) &&
        user.assignedLicensees.length > 0
      ) {
        userLicensees = user.assignedLicensees;
      }

      if (userLicensees.length > 0) {
        const result = await fetchLicensees();
        const allLicensees = Array.isArray(result.licensees)
          ? result.licensees
          : [];
        const names = userLicensees
          .map(id => {
            const licensee = allLicensees.find(
              l => String(l._id) === String(id)
            );
            return licensee?.name;
          })
          .filter((name): name is string => name !== undefined);
        setLicenseeNames(names);
      }
    };
    loadLicenseeNames();
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

  if (initialLoading || loading) {
    return (
      <>
        {/* Desktop: Table Skeleton */}
        <div className="hidden lg:block">
          <ClientOnly fallback={<CabinetTableSkeleton />}>
            <CabinetTableSkeleton />
          </ClientOnly>
        </div>

        {/* Mobile: Card Skeleton */}
        <div className="block lg:hidden">
          <ClientOnly fallback={<CabinetCardSkeleton />}>
            <CabinetCardSkeleton />
          </ClientOnly>
        </div>
      </>
    );
  }

  if (filteredCabinets.length === 0) {
    console.warn('[CABINET DISPLAY] No data to display', {
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
            ? `No machines found for ${licenseeName}.`
            : 'No machines found in the system.';
      } else if (licenseeNames.length > 0) {
        const licenseeList = licenseeNames.join(', ');
        emptyMessage = `No machines found in your allowed locations for ${licenseeList}.`;
      } else {
        emptyMessage = 'No machines found in your allowed locations.';
      }
    } else {
      emptyMessage = `No machines found for ${selectedLicencee === 'all' ? 'any licensee' : licenseeName}.`;
    }

    return (
      <div className="mt-6">
        <NoDataMessage message={emptyMessage} />
        {allCabinets.length === 0 && (
          <div className="mt-4 text-center">
            <Button onClick={onRetry} variant="outline">
              Retry Loading
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
        <CabinetTable
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
        />
      </div>

      {/* Mobile/Tablet: Card View */}
      <div className="mt-4 block lg:hidden" ref={cardsRef}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
                onEdit={() => handleEdit(machine)}
                onDelete={() => handleDelete(machine)}
                canEditMachines={canEditMachines}
                canDeleteMachines={canDeleteMachines}
              />
            ))}
          </ClientOnly>
        </div>
      </div>

      {/* Pagination */}
      {!loading && paginatedCabinets.length > 0 && totalPages > 1 && (
        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          setCurrentPage={onPageChange}
        />
      )}
    </>
  );
};

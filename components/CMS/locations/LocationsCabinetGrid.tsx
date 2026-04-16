/**
 * Cabinet Grid Component
 * Grid/table component for displaying cabinets in location details with filtering and actions.
 *
 * Features:
 * - Desktop table view and mobile card view
 * - Cabinet information display
 * - Online/offline status indicators
 * - Financial metrics display
 * - Edit, delete, and view actions
 * - Copy to clipboard functionality
 * - Search and filter capabilities
 * - Sorting functionality
 * - Pagination
 * - GSAP animations for status indicators
 * - Role-based action permissions
 *
 * Large component (~342 lines) handling cabinet display and management in location details.
 *
 * @param cabinets - Array of cabinet details
 * @param loading - Whether data is loading
 * @param onEdit - Callback when edit is clicked
 * @param onDelete - Callback when delete is clicked
 * @param sortOption - Current sort option
 * @param onSortChange - Callback when sort changes
 */
import CabinetTable from '@/components/CMS/cabinets/CabinetsCabinetTable';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import type { LocationsCabinetGridProps } from '@/lib/types/components';
import { CabinetSortOption } from '@/lib/hooks/data';
import { GamingMachine as Cabinet } from '@/shared/types/entities';
import { ExtendedCabinetDetail } from '@/lib/types/pages';
import { canDeleteMachines, canEditMachines, canViewArchivedMachines, canPermanentlyDeleteMachines, UserRole } from '@/lib/utils/permissions';
import { copyToClipboard } from '@/lib/utils/common/clipboard';
import Image from 'next/image';
import { useState } from 'react';
import LocationsCabinetCardMobile from './mobile/LocationsCabinetCardMobile';

export default function LocationsCabinetGrid({
  filteredCabinets,
  currentPage,
  itemsPerPage,
  router,
  sortOption: externalSortOption,
  sortOrder: externalSortOrder,
  onSortChange,
  onRestore,
  onPermanentDelete,
  showArchived = false,
  includeJackpot = true,
}: LocationsCabinetGridProps & { includeJackpot?: boolean }) {
  // Use external sort state if provided, otherwise use local state
  const [internalSortOption, setInternalSortOption] =
    useState<CabinetSortOption>('moneyIn');
  const [internalSortOrder, setInternalSortOrder] = useState<'asc' | 'desc'>(
    'desc'
  );

  const sortOption = externalSortOption || internalSortOption;
  const sortOrder = externalSortOrder || internalSortOrder;

  // Use cabinet actions store for modal management
  const { openEditModal, openDeleteModal } = useCabinetsActionsStore();
  const user = useUserStore(state => state.user);
  const userRoles = (user?.roles || []) as UserRole[];

  const canEdit = canEditMachines(userRoles);
  const canDelete = canDeleteMachines(userRoles);
  const canViewArchived = canViewArchivedMachines(userRoles);
  const canPermanentlyDelete = canPermanentlyDeleteMachines(userRoles);

  /**
   * Handles column sorting with toggle behavior.
   * Uses external handler if provided, otherwise manages internal state.
   */
  const handleColumnSort = (column: CabinetSortOption) => {
    if (onSortChange) {
      // Use external sort handler if provided
      const newOrder =
        sortOption === column ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
      onSortChange(column, newOrder);
    } else {
      // Use internal state management if no external handler
      if (sortOption === column) {
        // Toggle order if clicking same column
        setInternalSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setInternalSortOption(column);
        setInternalSortOrder('desc');
      }
    }
  };

  /**
   * Opens edit modal for a cabinet using the cabinet actions store.
   */
  const handleEdit = (cabinet: ExtendedCabinetDetail) => {
    openEditModal(cabinet as Cabinet);
  };

  /**
   * Opens delete modal for a cabinet using the cabinet actions store.
   */
  const handleDelete = (cabinet: ExtendedCabinetDetail) => {
    openDeleteModal(cabinet as Cabinet);
  };

  return (
    <div>
      {/* Table view for lg screens and above */}
      <div className="hidden lg:block">
        <CabinetTable
          data={filteredCabinets
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map(cabinet => ({
              ...(cabinet as Cabinet),
              smbId: (cabinet.relayId ||
                cabinet.smbId ||
                cabinet.smibBoard ||
                '') as string,
              onEdit: () => handleEdit(cabinet as ExtendedCabinetDetail),
              onDelete: () => handleDelete(cabinet as ExtendedCabinetDetail),
              onRestore: () => onRestore?.(cabinet),
              onPermanentDelete: () => onPermanentDelete?.(cabinet),
            }))}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={column => handleColumnSort(column as CabinetSortOption)}
          onEdit={cabinet => handleEdit(cabinet as ExtendedCabinetDetail)}
          onDelete={cabinet => handleDelete(cabinet as ExtendedCabinetDetail)}
          onRestore={cabinet => onRestore?.(cabinet)}
          onPermanentDelete={cabinet => onPermanentDelete?.(cabinet)}
          canEditMachines={canEdit}
          canDeleteMachines={canDelete}
          canViewArchived={canViewArchived}
          canPermanentlyDeleteMachines={canPermanentlyDelete}
          showArchived={showArchived}
          includeJackpot={includeJackpot}
        />
      </div>

      {/* Grid view for smaller screens */}
      <div className="mt-4 block lg:hidden">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredCabinets
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map((cabinet: ExtendedCabinetDetail) => (
              <LocationsCabinetCardMobile
                key={cabinet._id}
                cabinet={cabinet}
                router={router}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onRestore={onRestore}
                onPermanentDelete={onPermanentDelete}
                canEditMachines={canEdit}
                canDeleteMachines={canDelete}
                canViewArchived={canViewArchived}
                canPermanentlyDeleteMachines={canPermanentlyDelete}
                showArchived={showArchived}
                copyToClipboard={copyToClipboard}
              />
            ))}
        </div>
      </div>

      {/* Show empty state if no cabinets found */}
      {filteredCabinets.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center">
          <Image
            src="/images/no-data.svg"
            width={120}
            height={120}
            alt="No data"
            className="mx-auto mb-3"
          />
          <h3 className="text-lg font-medium text-gray-900">
            No cabinets found
          </h3>
          <p className="text-gray-500">
            No cabinets match your search criteria.
          </p>
        </div>
      )}

      {/* Modals are managed globally by the cabinet actions store */}
    </div>
  );
}

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
import { Button } from '@/components/shared/ui/button';
import CurrencyValueWithOverflow from '@/components/shared/ui/CurrencyValueWithOverflow';
import type { CabinetSortOption } from '@/lib/hooks/data';
import { useCabinetsActionsStore } from '@/lib/store/cabinetActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import type { LocationsCabinetGridProps } from '@/lib/types/components';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import { formatCurrency } from '@/lib/utils';
import {
    getGrossColorClass,
    getMoneyInColorClass,
    getMoneyOutColorClass,
} from '@/lib/utils/financial';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import { formatDistanceToNow } from 'date-fns';
import gsap from 'gsap';
import { Clock, Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

// ============================================================================
// Helper Components
// ============================================================================

function CabinetCardMobile({
  cabinet,
  router,
  onEdit,
  onDelete,
  canEditMachines = true,
  canDeleteMachines = true,
  copyToClipboard,
}: {
  cabinet: ExtendedCabinetDetail;
  router: AppRouterInstance;
  onEdit: (cabinet: ExtendedCabinetDetail) => void;
  onDelete: (cabinet: ExtendedCabinetDetail) => void;
  canEditMachines?: boolean;
  canDeleteMachines?: boolean;
  copyToClipboard: (text: string, label: string) => void;
}) {
  const statusRef = useRef<HTMLSpanElement>(null);
  /**
   * Animates online status indicator with pulsing effect.
   * Only animates when cabinet is online.
   */
  useEffect(() => {
    // Only animate if cabinet is online and ref is available
    if (cabinet.isOnline && statusRef.current) {
      const tl = gsap.timeline({ repeat: -1, yoyo: true });
      tl.to(statusRef.current, {
        scale: 1.3,
        opacity: 0.7,
        duration: 1,
        ease: 'power1.inOut',
      }).to(statusRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: 'power1.inOut',
      });
      return () => {
        tl.kill();
      };
    }
    return undefined;
  }, [cabinet.isOnline]);
  return (
    <div
      key={cabinet._id}
      className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="max-w-[60%] truncate font-semibold">
          {getSerialNumberIdentifier(cabinet)}
        </h3>
        <span
          ref={statusRef}
          className={`inline-flex h-3 w-3 items-center justify-center rounded-full ${
            cabinet.isOnline ? 'bg-green-500' : 'bg-red-500'
          }`}
          title={cabinet.isOnline ? 'Online' : 'Offline'}
        ></span>
      </div>
      
      {/* Offline Status - Show when offline */}
      {!cabinet.isOnline && (
        <div className="mb-3 flex flex-col gap-1 text-xs text-red-600 font-medium">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3" />
            <span>
              {cabinet.offlineTimeLabel 
                ? (cabinet.offlineTimeLabel === 'Never' ? 'Never Online' : `Offline ${cabinet.offlineTimeLabel}`)
                : (cabinet.lastOnline ? `Offline ${formatDistanceToNow(new Date(cabinet.lastOnline), { addSuffix: true })}` : 'Never Online')}
            </span>
          </div>
          {cabinet.actualOfflineTime && cabinet.actualOfflineTime !== (cabinet.offlineTimeLabel || (cabinet.lastOnline ? formatDistanceToNow(new Date(cabinet.lastOnline), { addSuffix: true }) : 'Never')) && (
            <div className="ml-[18px] text-[10px] opacity-70 italic text-gray-500">
              (Actual Offline Time: {cabinet.actualOfflineTime})
            </div>
          )}
        </div>
      )}
      <p className="mb-1 text-sm text-gray-600">
        Game:{' '}
        {/* Show game name or placeholder if not provided */}
        {cabinet.game || cabinet.installedGame ? (
          cabinet.game || cabinet.installedGame
        ) : (
          <span className="text-red-600">(game name not provided)</span>
        )}
      </p>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-sm text-gray-600">SMIB:</span>
        <button
          onClick={e => {
            e.stopPropagation();
            const smibId =
              cabinet.relayId || cabinet.smibBoard || cabinet.smbId;
            // Copy SMIB ID to clipboard when clicked
            if (smibId) {
              copyToClipboard(smibId, 'SMIB');
            }
          }}
          className={`flex items-center gap-1 whitespace-normal break-words text-sm ${
            cabinet.relayId || cabinet.smibBoard || cabinet.smbId
              ? 'cursor-pointer text-gray-600 hover:text-blue-600 hover:underline'
              : 'text-gray-400'
          }`}
          title={
            cabinet.relayId || cabinet.smibBoard || cabinet.smbId
              ? 'Click to copy SMIB'
              : 'No SMIB'
          }
          disabled={!cabinet.relayId && !cabinet.smibBoard && !cabinet.smbId}
        >
          <span>
            {cabinet.relayId || cabinet.smibBoard || cabinet.smbId || 'N/A'}
          </span>
          {/* Show copy icon only if SMIB ID exists */}
          {(cabinet.relayId || cabinet.smibBoard || cabinet.smbId) && (
            <Copy className="h-3 w-3 flex-shrink-0" />
          )}
        </button>
      </div>
      <div className="mt-2 border-t border-gray-200 pt-2">
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Money In:</span>
          <CurrencyValueWithOverflow
            value={cabinet.moneyIn || 0}
            className={`text-xs font-medium ${getMoneyInColorClass()}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Money Out:</span>
          <CurrencyValueWithOverflow
            value={cabinet.moneyOut || 0}
            className={`text-xs font-medium ${getMoneyOutColorClass(cabinet.moneyOut, cabinet.moneyIn)}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">Gross:</span>
          <CurrencyValueWithOverflow
            value={cabinet.gross || 0}
            className={`text-xs font-medium ${getGrossColorClass(cabinet.gross)}`}
            formatCurrencyFn={formatCurrency}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2 border-t border-gray-200 pt-3">
        <Button
          onClick={() => router.push(`/cabinets/${cabinet._id}`)}
          variant="outline"
          size="sm"
          className="flex flex-1 items-center justify-center gap-1.5 text-xs"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>View</span>
        </Button>
        {/* Show Edit button only if user can edit machines */}
        {canEditMachines && (
          <Button
            onClick={() => onEdit(cabinet)}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:bg-blue-50 hover:text-blue-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            <span>Edit</span>
          </Button>
        )}
        {/* Show Delete button only if user can delete machines */}
        {canDeleteMachines && (
          <Button
            onClick={() => onDelete(cabinet)}
            variant="outline"
            size="sm"
            className="flex items-center justify-center gap-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </Button>
        )}
      </div>
    </div>
  );
}

export default function LocationsCabinetGrid({
  filteredCabinets,
  currentPage,
  itemsPerPage,
  router,
  sortOption: externalSortOption,
  sortOrder: externalSortOrder,
  onSortChange,
}: LocationsCabinetGridProps) {
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

  /**
   * Copies text to clipboard with fallback for older browsers.
   * Shows toast notifications for success/error states.
   */
  const copyToClipboard = async (text: string, label: string) => {
    // Don't copy if text is empty or N/A
    if (!text || text.trim() === '' || text === 'N/A') {
      toast.error(`No ${label} value to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text.trim());
      toast.success(`${label} copied to clipboard`);
    } catch {
      // Use fallback method for older browsers that don't support clipboard API
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text.trim();
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        if (successful) {
          toast.success(`${label} copied to clipboard`);
        } else {
          throw new Error('execCommand failed');
        }
      } catch (fallbackError) {
        console.error('Failed to copy to clipboard:', fallbackError);
        toast.error(`Failed to copy ${label}. Please try again.`);
      }
    }
  };

  /**
   * Determines if user can edit machines.
   * Collectors cannot edit, but technicians, managers, admins, developers, and location admins can.
   */
  const canEditMachines = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Collectors cannot edit machines
    if (userRoles.includes('collector')) {
      return false;
    }
    // Check if user has a role that allows editing
    return [
      'developer',
      'admin',
      'manager',
      'location admin',
      'technician',
    ].some(role => userRoles.includes(role));
  }, [user]);

  /**
   * Determines if user can delete machines.
   * Collectors and technicians cannot delete, only managers, admins, developers, and location admins can.
   */
  const canDeleteMachines = useMemo(() => {
    if (!user || !user.roles) return false;
    const userRoles = user.roles || [];
    // Collectors and technicians cannot delete machines
    if (userRoles.includes('collector') || userRoles.includes('technician')) {
      return false;
    }
    // Check if user has a role that allows deletion
    return ['developer', 'admin', 'manager', 'location admin'].some(role =>
      userRoles.includes(role)
    );
  }, [user]);

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
              onEdit: () => handleEdit(cabinet),
              onDelete: () => handleDelete(cabinet),
            }))}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={column => handleColumnSort(column as CabinetSortOption)}
          onEdit={cabinet => handleEdit(cabinet as ExtendedCabinetDetail)}
          onDelete={cabinet => handleDelete(cabinet as ExtendedCabinetDetail)}
          canEditMachines={canEditMachines}
          canDeleteMachines={canDeleteMachines}
        />
      </div>

      {/* Grid view for smaller screens */}
      <div className="mt-4 block lg:hidden">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filteredCabinets
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map((cabinet: ExtendedCabinetDetail) => (
              <CabinetCardMobile
                key={cabinet._id}
                cabinet={cabinet}
                router={router}
                onEdit={handleEdit}
                onDelete={handleDelete}
                canEditMachines={canEditMachines}
                canDeleteMachines={canDeleteMachines}
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


import { Button } from '@/components/ui/button';
import CabinetTable from '@/components/ui/cabinets/CabinetTable';
import CurrencyValueWithOverflow from '@/components/ui/CurrencyValueWithOverflow';
import type { CabinetSortOption } from '@/lib/hooks/data';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import { useUserStore } from '@/lib/store/userStore';
import type { CabinetGridProps } from '@/lib/types/components';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import { formatCurrency } from '@/lib/utils';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import gsap from 'gsap';
import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import Image from 'next/image';
import React from 'react';
import { toast } from 'sonner';

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
  const statusRef = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
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
      <p className="mb-1 text-sm text-gray-600">
        Game: {cabinet.game || cabinet.installedGame || 'Unknown'}
      </p>
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-sm text-gray-600">SMIB:</span>
        <button
          onClick={e => {
            e.stopPropagation();
            const smibId =
              cabinet.relayId || cabinet.smibBoard || cabinet.smbId;
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
            className="text-xs font-medium"
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Money Out:</span>
          <CurrencyValueWithOverflow
            value={cabinet.moneyOut || 0}
            className="text-xs font-medium"
            formatCurrencyFn={formatCurrency}
          />
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">Gross:</span>
          <CurrencyValueWithOverflow
            value={cabinet.gross || 0}
            className="text-xs font-medium"
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

export default function CabinetGrid({
  filteredCabinets,
  currentPage,
  itemsPerPage,
  router,
}: CabinetGridProps) {
  // Handle sorting for the table view
  const [sortOption, setSortOption] =
    React.useState<CabinetSortOption>('moneyIn');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  // Use cabinet actions store for modal management
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();
  const user = useUserStore(state => state.user);

  // Copy to clipboard function
  const copyToClipboard = async (text: string, label: string) => {
    if (!text || text.trim() === '' || text === 'N/A') {
      toast.error(`No ${label} value to copy`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text.trim());
      toast.success(`${label} copied to clipboard`);
    } catch {
      // Fallback for older browsers or when clipboard API is not available
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

  // Check if user can edit/delete machines
  // Technicians can edit but not delete, collectors cannot edit or delete
  const canEditMachines = React.useMemo(() => {
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

  const canDeleteMachines = React.useMemo(() => {
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

  const handleColumnSort = (column: CabinetSortOption) => {
    if (sortOption === column) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortOption(column);
      setSortOrder('desc');
    }
  };

  // Handle cabinet actions using store
  const handleEdit = (cabinet: ExtendedCabinetDetail) => {
    openEditModal(cabinet as Cabinet);
  };

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
          loading={false}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onSort={column => handleColumnSort(column as CabinetSortOption)}
          onPageChange={() => {}}
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

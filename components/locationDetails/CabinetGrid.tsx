import React from 'react';
import Image from 'next/image';
import { formatCurrency } from '@/lib/utils';

// Import SVG icons for pre-rendering
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import { getSerialNumberIdentifier } from '@/lib/utils/serialNumber';
import type { GamingMachine as Cabinet } from '@/shared/types/entities';
import type { CabinetSortOption } from '@/lib/hooks/data';
import type { ExtendedCabinetDetail } from '@/lib/types/pages';
import type { CabinetGridProps } from '@/lib/types/components';
import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import CabinetTable from '@/components/ui/cabinets/CabinetTable';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import gsap from 'gsap';

function CabinetCardMobile({
  cabinet,
  router,
  onEdit,
  onDelete,
}: {
  cabinet: ExtendedCabinetDetail;
  router: AppRouterInstance;
  onEdit: (cabinet: ExtendedCabinetDetail) => void;
  onDelete: (cabinet: ExtendedCabinetDetail) => void;
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
      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
      onClick={() => router.push(`/cabinets/${cabinet._id}`)}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="max-w-[60%] truncate font-semibold">
          {getSerialNumberIdentifier(cabinet)}
        </h3>
        <div className="flex items-center gap-2">
          <span
            ref={statusRef}
            className={`inline-flex h-3 w-3 items-center justify-center rounded-full ${
              cabinet.isOnline ? 'bg-green-500' : 'bg-red-500'
            }`}
            title={cabinet.isOnline ? 'Online' : 'Offline'}
          ></span>
          <div className="flex gap-1">
            <button
              onClick={e => {
                e.stopPropagation();
                onEdit(cabinet);
              }}
              className="rounded p-1 hover:bg-gray-100"
              title="Edit"
            >
              <Image
                src={editIcon}
                alt="Edit"
                width={16}
                height={16}
                className="h-4 w-4"
              />
            </button>
            <button
              onClick={e => {
                e.stopPropagation();
                onDelete(cabinet);
              }}
              className="rounded p-1 text-red-600 hover:bg-gray-100"
              title="Delete"
            >
              <Image
                src={deleteIcon}
                alt="Delete"
                width={16}
                height={16}
                className="h-4 w-4"
              />
            </button>
          </div>
        </div>
      </div>
      <p className="mb-1 text-sm text-gray-600">
        Game: {cabinet.game || cabinet.installedGame || 'Unknown'}
      </p>
      <p className="mb-1 text-sm text-gray-600">
        SMIB: {cabinet.smibBoard || cabinet.smbId || 'N/A'}
      </p>
      <div className="mt-2 border-t border-gray-200 pt-2">
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Money In:</span>
          <span className="text-xs font-medium">
            {formatCurrency(cabinet.moneyIn || 0)}
          </span>
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-xs text-gray-500">Money Out:</span>
          <span className="text-xs font-medium">
            {formatCurrency(cabinet.moneyOut || 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-xs text-gray-500">Gross:</span>
          <span className="text-xs font-medium">
            {formatCurrency(cabinet.gross || 0)}
          </span>
        </div>
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

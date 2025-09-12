import React from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { getSerialNumberIdentifier } from "@/lib/utils/serialNumber";
import type { Cabinet, CabinetSortOption } from "@/lib/types/cabinets";
import type { ExtendedCabinetDetail } from "@/lib/types/pages";
import type { CabinetGridProps } from "@/lib/types/components";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import CabinetTable from "@/components/ui/cabinets/CabinetTable";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import gsap from "gsap";

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
        ease: "power1.inOut",
      }).to(statusRef.current, {
        scale: 1,
        opacity: 1,
        duration: 1,
        ease: "power1.inOut",
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
      className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => router.push(`/cabinets/${cabinet._id}`)}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold truncate max-w-[60%]">
          {getSerialNumberIdentifier(cabinet)}
        </h3>
        <div className="flex items-center gap-2">
          <span
            ref={statusRef}
            className={`inline-flex items-center justify-center w-3 h-3 rounded-full ${
              cabinet.isOnline ? "bg-green-500" : "bg-red-500"
            }`}
            title={cabinet.isOnline ? "Online" : "Offline"}
          ></span>
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(cabinet);
              }}
              className="p-1 hover:bg-gray-100 rounded"
              title="Edit"
            >
              <Image
                src="/editIcon.svg"
                alt="Edit"
                width={16}
                height={16}
                className="w-4 h-4"
              />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(cabinet);
              }}
              className="p-1 hover:bg-gray-100 rounded text-red-600"
              title="Delete"
            >
              <Image
                src="/deleteIcon.svg"
                alt="Delete"
                width={16}
                height={16}
                className="w-4 h-4"
              />
            </button>
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-600 mb-1">
        Game: {cabinet.game || cabinet.installedGame || "Unknown"}
      </p>
      <p className="text-sm text-gray-600 mb-1">
        SMIB: {cabinet.smibBoard || cabinet.smbId || "N/A"}
      </p>
      <div className="border-t border-gray-200 mt-2 pt-2">
        <div className="flex justify-between mb-1">
          <span className="text-xs text-gray-500">Money In:</span>
          <span className="text-xs font-medium">
            {formatCurrency(cabinet.moneyIn || 0)}
          </span>
        </div>
        <div className="flex justify-between mb-1">
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
    React.useState<CabinetSortOption>("moneyIn");
  const [sortOrder, setSortOrder] = React.useState<"asc" | "desc">("desc");

  // Use cabinet actions store for modal management
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  const handleColumnSort = (column: CabinetSortOption) => {
    if (sortOption === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortOption(column);
      setSortOrder("desc");
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
          cabinets={filteredCabinets
            .slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage)
            .map((cabinet) => ({
              ...(cabinet as Cabinet),
              onEdit: () => handleEdit(cabinet),
              onDelete: () => handleDelete(cabinet),
            }))}
          sortOption={sortOption}
          sortOrder={sortOrder}
          onColumnSort={handleColumnSort}
          onEdit={(cabinet) => handleEdit(cabinet as ExtendedCabinetDetail)}
          onDelete={(cabinet) => handleDelete(cabinet as ExtendedCabinetDetail)}
        />
      </div>

      {/* Grid view for smaller screens */}
      <div className="block mt-4 lg:hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="bg-white rounded-lg p-6 text-center border border-gray-200">
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

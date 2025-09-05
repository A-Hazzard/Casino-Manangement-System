"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import formatCurrency from "@/lib/utils/currency";
import { formatDistanceToNow } from "date-fns";
import {
  CabinetSortOption,
  CabinetTableProps,
} from "@/lib/types/cabinets";
import { ClockIcon, Cross1Icon, MobileIcon } from "@radix-ui/react-icons";
import { IMAGES } from "@/lib/constants/images";

export default function CabinetTable({
  cabinets,
  sortOption,
  sortOrder,
  onColumnSort,
  onEdit,
  onDelete,
}: CabinetTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const router = useRouter();

  // Navigate to cabinet detail page
  const navigateToCabinet = (cabinetId: string) => {
    router.push(`/cabinets/${cabinetId}`);
  };

  return (
    <div className="overflow-x-auto">
      <table
        ref={tableRef}
        className="table-fixed w-full border-collapse text-center"
      >
        <thead className="bg-[#00b517] text-white">
          <tr>
            <th
              className="p-3 border border-[#00b517] text-sm cursor-pointer relative"
              onClick={() => onColumnSort("assetNumber" as CabinetSortOption)}
            >
              <span>ASSET NUMBER</span>
              {sortOption === "assetNumber" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th
              className="p-3 border border-[#00b517] text-sm cursor-pointer relative"
              onClick={() => onColumnSort("moneyIn" as CabinetSortOption)}
            >
              <span>HANDLE</span>
              {sortOption === "moneyIn" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th
              className="p-3 border border-[#00b517] text-sm cursor-pointer relative"
              onClick={() => onColumnSort("moneyOut" as CabinetSortOption)}
            >
              <span>CANCELLED</span>
              {sortOption === "moneyOut" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th
              className="p-3 border border-[#00b517] text-sm cursor-pointer relative"
              onClick={() => onColumnSort("jackpot" as CabinetSortOption)}
            >
              <span>JACKPOT</span>
              {sortOption === "jackpot" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th
              className="p-3 border border-[#00b517] text-sm cursor-pointer relative"
              onClick={() => onColumnSort("gross" as CabinetSortOption)}
            >
              <span>GROSS</span>
              {sortOption === "gross" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th className="p-3 border border-[#00b517] text-sm">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {cabinets.map((cab) => {
            const isOnline =
              cab.lastOnline &&
              new Date(cab.lastOnline) > new Date(Date.now() - 5 * 60 * 1000);
            const lastOnlineText = cab.lastOnline
              ? formatDistanceToNow(new Date(cab.lastOnline), {
                  addSuffix: true,
                })
              : "Never";

            return (
              <tr
                key={cab._id}
                className="cursor-pointer hover:bg-grayHighlight/10"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("td:last-child")) {
                    navigateToCabinet(cab._id);
                  }
                }}
              >
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-left hover:bg-accent">
                  <div className="font-medium">
                    {cab.assetNumber || "(No Asset #)"}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {cab.game || "(No Game Name)"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    SMIB: {cab.smbId || "N/A"}
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block w-fit ${
                      isOnline
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    } flex items-center gap-1`}
                  >
                    {isOnline ? (
                      <MobileIcon className="w-3 h-3" />
                    ) : (
                      <Cross1Icon className="w-3 h-3" />
                    )}
                    {isOnline ? "Online" : "Offline"}
                  </span>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" /> {lastOnlineText}
                  </div>
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  {formatCurrency(cab.moneyIn)}
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  {formatCurrency(cab.moneyOut)}
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  <span className="font-semibold">
                    {formatCurrency(cab.jackpot)}
                  </span>
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(cab.gross)}
                  </span>
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm hover:bg-accent">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(cab);
                      }}
                      className="p-1 h-8 w-8 hover:bg-accent"
                    >
                      <Image src={IMAGES.editIcon} alt="Edit" width={16} height={16} className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(cab);
                      }}
                      className="p-1 h-8 w-8 hover:bg-accent"
                    >
                      <Image
                        src={IMAGES.deleteIcon}
                        alt="Delete"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

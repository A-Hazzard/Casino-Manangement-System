"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import formatCurrency from "@/lib/utils/currency";
import { formatDistanceToNow } from "date-fns";
import type { GamingMachine as Cabinet } from "@/shared/types/entities";
import type { DataTableProps } from "@/shared/types/components";
import { formatMachineDisplayNameWithBold } from "@/lib/utils/machineDisplay";
type CabinetTableProps = DataTableProps<Cabinet> & {
  onMachineClick?: (machineId: string) => void;
  showLocation?: boolean;
  showStatus?: boolean;
  showMetrics?: boolean;
};
import { ClockIcon, Cross1Icon, MobileIcon } from "@radix-ui/react-icons";
import { IMAGES } from "@/lib/constants/images";

export default function CabinetTable({
  data: cabinets,
  loading: _loading,
  sortOption,
  sortOrder,
  onSort,
  onPageChange: _onPageChange,
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
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      <Table ref={tableRef} className="table-fixed w-full">
        <TableHeader>
          <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
            <TableHead
              className="text-white font-semibold cursor-pointer relative"
              onClick={() => onSort("assetNumber")}
              isFirstColumn={true}
            >
              <span>ASSET NUMBER</span>
              {sortOption === "assetNumber" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer relative"
              onClick={() => onSort("moneyIn")}
            >
              <span>MONEY IN</span>
              {sortOption === "moneyIn" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer relative"
              onClick={() => onSort("moneyOut")}
            >
              <span>MONEY OUT</span>
              {sortOption === "moneyOut" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer relative"
              onClick={() => onSort("jackpot")}
            >
              <span>JACKPOT</span>
              {sortOption === "jackpot" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </TableHead>
            <TableHead
              className="text-white font-semibold cursor-pointer relative"
              onClick={() => onSort("gross")}
            >
              <span>GROSS</span>
              {sortOption === "gross" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </TableHead>
            <TableHead className="text-white font-semibold">ACTIONS</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
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
              <TableRow
                key={cab._id}
                className="cursor-pointer hover:bg-grayHighlight/10"
                onClick={(e) => {
                  // Don't navigate if clicking on action buttons or their container
                  const target = e.target as HTMLElement;
                  if (
                    target.closest(".action-buttons") ||
                    target.closest("button")
                  ) {
                    return;
                  }
                  navigateToCabinet(cab._id);
                }}
              >
                <TableCell isFirstColumn={true}>
                  <div className="font-medium">
                    {cab.assetNumber || "(No Asset #)"}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    {formatMachineDisplayNameWithBold(cab)}
                  </div>
                  <div className="text-xs text-gray-600 mt-1 font-bold">
                    {cab.locationName || "(No Location)"}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    SMIB: {cab.smbId || "N/A"}
                  </div>
                  <Badge
                    variant={isOnline ? "default" : "destructive"}
                    className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block w-fit ${
                      isOnline
                        ? "bg-green-100 text-green-700 hover:bg-green-200"
                        : "bg-red-100 text-red-700 hover:bg-red-200"
                    } flex items-center gap-1`}
                  >
                    {isOnline ? (
                      <MobileIcon className="w-3 h-3" />
                    ) : (
                      <Cross1Icon className="w-3 h-3" />
                    )}
                    {isOnline ? "Online" : "Offline"}
                  </Badge>
                  <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" /> {lastOnlineText}
                  </div>
                </TableCell>
                <TableCell>{formatCurrency(cab.moneyIn)}</TableCell>
                <TableCell>{formatCurrency(cab.moneyOut)}</TableCell>
                <TableCell>
                  <span className="font-semibold">
                    {formatCurrency(cab.jackpot)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(cab.gross)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-2 action-buttons">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit?.(cab);
                      }}
                      className="p-1 h-8 w-8 hover:bg-accent"
                    >
                      <Image
                        src={IMAGES.editIcon}
                        alt="Edit"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete?.(cab);
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
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

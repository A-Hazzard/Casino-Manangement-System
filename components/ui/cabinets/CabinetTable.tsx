"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import formatCurrency from "@/lib/utils/currency";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import {
  CabinetProps,
  CabinetSortOption,
  CabinetTableProps,
} from "@/lib/types/cabinets";
import { ClockIcon, Cross1Icon, MobileIcon } from "@radix-ui/react-icons";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

export default function CabinetTable({
  cabinets,
  sortOption,
  sortOrder,
  onColumnSort,
  onEdit,
  onDelete,
}: CabinetTableProps) {
  const tableRef = useRef<HTMLTableElement>(null);
  const prevCabinetsRef = useRef<CabinetProps[]>([]);
  const router = useRouter();

  // Animate table rows on data change
  useEffect(() => {
    if (
      cabinets.length > 0 &&
      JSON.stringify(cabinets) !== JSON.stringify(prevCabinetsRef.current)
    ) {
      prevCabinetsRef.current = [...cabinets];

      const rows = tableRef.current?.querySelectorAll("tbody tr");
      if (rows && rows.length > 0) {
        gsap.fromTo(
          rows,
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            stagger: 0.05,
            duration: 0.4,
            ease: "power2.out",
          }
        );
      }
    }
  }, [cabinets]);

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
        <thead className="bg-button text-white">
          <tr>
            <th
              className="p-3 border border-border border-t-0 text-sm cursor-pointer relative"
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
              className="p-3 border border-border border-t-0  text-sm cursor-pointer relative"
              onClick={() => onColumnSort("moneyIn" as CabinetSortOption)}
            >
              <span>MONEY IN</span>
              {sortOption === "moneyIn" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th
              className="p-3 border border-border border-t-0  text-sm cursor-pointer relative"
              onClick={() =>
                onColumnSort("cancelledCredits" as CabinetSortOption)
              }
            >
              <span>CANCELLED CREDITS</span>
              {sortOption === "cancelledCredits" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th
              className="p-3 border border-border border-t-0  text-sm cursor-pointer relative"
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
              className="p-3 border border-border border-t-0  text-sm cursor-pointer relative"
              onClick={() => onColumnSort("gross" as CabinetSortOption)}
            >
              <span>GROSS</span>
              {sortOption === "gross" && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                  {sortOrder === "desc" ? "▼" : "▲"}
                </span>
              )}
            </th>
            <th className="p-3 border border-border border-t-0  text-sm">
              ACTIONS
            </th>
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
                <td className="p-3 bg-container border border-border text-sm text-left hover:bg-grayHighlight/20">
                  <div className="font-medium">
                    {cab.assetNumber || "(No Asset #)"}
                  </div>
                  <div className="text-xs text-grayHighlight mt-1">
                    {cab.game || "(No Game Name)"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    SMIB: {cab.smbId || "N/A"}
                  </div>
                  <div className="mt-2 flex flex-col space-y-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full self-start ${
                        isOnline
                          ? "bg-green-100 text-button"
                          : "bg-red-100 text-destructive"
                      } flex items-center gap-1`}
                    >
                      {isOnline ? (
                        <MobileIcon className="w-3 h-3" />
                      ) : (
                        <Cross1Icon className="w-3 h-3" />
                      )}
                      {isOnline ? "Online" : "Offline"}
                    </span>
                    <span
                      className="text-xs text-muted-foreground flex items-center gap-1"
                      title={`Last seen: ${lastOnlineText}`}
                    >
                      <ClockIcon className="w-3 h-3" /> {lastOnlineText}
                    </span>
                  </div>
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                  ${formatCurrency(cab.moneyIn)}
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                  ${formatCurrency(cab.cancelledCredits)}
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                  ${formatCurrency(cab.jackpot)}
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                  <span
                    className={((cab.gross || 0) < 0
                      ? "text-destructive font-semibold"
                      : "text-button font-semibold"
                    ).trim()}
                  >
                    ${formatCurrency(cab.gross)}
                  </span>
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-grayHighlight/20">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(cab);
                      }}
                      className="p-1 hover:bg-buttonActive/10 text-grayHighlight"
                    >
                      <Image
                        src={editIcon}
                        alt="Edit"
                        width={20}
                        height={20}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(cab);
                      }}
                      className="p-1 hover:bg-destructive/10 text-destructive"
                    >
                      <Image
                        src={deleteIcon}
                        alt="Delete"
                        width={20}
                        height={20}
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

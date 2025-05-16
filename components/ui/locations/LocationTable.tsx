"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useLocationActionsStore } from "@/lib/store/locationActionsStore";
import gsap from "gsap";
import {
  LocationTableItem,
  LocationTableProps,
  LocationSortOption,
} from "@/lib/types/location";
import { useRouter } from "next/navigation";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";

export default function LocationTable({
  locations,
  sortOption,
  sortOrder,
  onColumnSort,
}: LocationTableProps) {
  const { openEditModal, openDeleteModal } = useLocationActionsStore();
  const tableRef = useRef<HTMLTableElement>(null);
  const prevLocationsRef = useRef<LocationTableItem[]>([]);
  const router = useRouter();

  // GSAP animation for table updates
  useEffect(() => {
    if (
      locations.length > 0 &&
      JSON.stringify(locations) !== JSON.stringify(prevLocationsRef.current)
    ) {
      // Store current locations for future comparison
      prevLocationsRef.current = [...(locations as LocationTableItem[])];

      // Animate the table rows
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
  }, [locations]);

  const handleRowClick = (locationId: string) => {
    router.push(`/locations/${locationId}`);
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table
          ref={tableRef}
          className="table-fixed w-full border-collapse text-center"
        >
          <thead className="bg-button text-white">
            <tr>
              {/* LOCATION NAME */}
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() =>
                  onColumnSort("locationName" as LocationSortOption)
                }
              >
                <span>LOCATION NAME</span>
                {sortOption === "locationName" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              {/* MONEY IN */}
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onColumnSort("moneyIn" as LocationSortOption)}
              >
                <span>MONEY IN</span>
                {sortOption === "moneyIn" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              {/* MONEY OUT */}
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onColumnSort("moneyOut" as LocationSortOption)}
              >
                <span>MONEY OUT</span>
                {sortOption === "moneyOut" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              {/* GROSS */}
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onColumnSort("gross" as LocationSortOption)}
              >
                <span>GROSS</span>
                {sortOption === "gross" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              {/* ACTIONS */}
              <th className="p-3 border border-border text-sm">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <tr
                key={loc.locationName}
                className="cursor-pointer hover:bg-muted"
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest("td:last-child")) {
                    handleRowClick(loc.location);
                  }
                }}
              >
                {/* LOCATION NAME + combined "MACHINES / ONLINE" pill */}
                <td className="p-3 bg-container border border-border text-sm text-left hover:bg-accent">
                  <div>{loc.locationName}</div>
                  <div className="mt-1 inline-flex text-primary-foreground text-[10px] leading-tight">
                    <span className="bg-blueHighlight px-1 py-0.5 rounded-l-full">
                      {loc.totalMachines} MACHINES
                    </span>
                    <span className="bg-button px-1 py-0.5 rounded-r-full">
                      {loc.onlineMachines} ONLINE
                    </span>
                  </div>
                </td>
                {/* MONEY IN */}
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  ${loc.moneyIn.toLocaleString()}
                </td>
                {/* MONEY OUT */}
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  ${loc.moneyOut.toLocaleString()}
                </td>
                {/* GROSS */}
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  <span
                    className={(loc.gross < 0
                      ? "text-destructive font-semibold"
                      : "text-button font-semibold"
                    ).trim()}
                  >
                    ${loc.gross.toLocaleString()}
                  </span>
                </td>
                {/* ACTIONS CELL */}
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditModal(loc);
                      }}
                      className="p-1 hover:bg-buttonActive/10 text-buttonActive"
                    >
                      <Image
                        src="/editIcon.svg"
                        width={20}
                        height={20}
                        alt="Edit"
                        className="w-5 h-5"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteModal(loc);
                      }}
                      className="p-1 hover:bg-destructive/10 text-destructive"
                    >
                      <Image
                        src="/deleteIcon.svg"
                        width={20}
                        height={20}
                        alt="Delete"
                        className="w-5 h-5"
                      />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {locations.length > 10 && (
        <div className="mt-6 flex items-center justify-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // First page logic would be handled by the parent component
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <DoubleArrowLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Previous page logic
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </Button>

          {/* Page numbers would be generated here */}
          <Button className="bg-buttonActive text-white px-3 py-1 scale-105">
            1
          </Button>

          <Button className="bg-gray-300 text-black px-3 py-1 hover:bg-gray-400">
            2
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Next page logic
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Last page logic
            }}
            className="bg-gray-300 text-black p-2 hover:bg-gray-400 transition-colors"
          >
            <DoubleArrowRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import gsap from "gsap";
import { LocationTableProps } from "@/lib/types/location";
import { AggregatedLocation } from "@/lib/types/location";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import React from "react";
import editIcon from "@/public/editIcon.svg";
import deleteIcon from "@/public/deleteIcon.svg";

const LocationTable: React.FC<LocationTableProps> = ({
  locations,
  sortOption,
  sortOrder,
  onSort,
  onLocationClick,
  onAction,
  formatCurrency,
}) => {
  const tableRef = useRef<HTMLTableElement>(null);
  const prevLocationsRef = useRef<AggregatedLocation[]>(locations);

  useEffect(() => {
    if (
      locations.length > 0 &&
      JSON.stringify(locations) !== JSON.stringify(prevLocationsRef.current)
    ) {
      prevLocationsRef.current = [...locations];
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
    onLocationClick(locationId);
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
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("locationName")}
              >
                <span>LOCATION NAME</span>
                {sortOption === "locationName" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("moneyIn")}
              >
                <span>MONEY IN</span>
                {sortOption === "moneyIn" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("moneyOut")}
              >
                <span>MONEY OUT</span>
                {sortOption === "moneyOut" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-border text-sm relative cursor-pointer"
                onClick={() => onSort("gross")}
              >
                <span>GROSS</span>
                {sortOption === "gross" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
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
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  {formatCurrency(loc.moneyIn ?? 0)}
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  {formatCurrency(loc.moneyOut ?? 0)}
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  <span
                    className={(
                      (loc.gross ?? 0) < 0
                      ? "text-destructive font-semibold"
                      : "text-button font-semibold"
                    ).trim()}
                  >
                    {formatCurrency(loc.gross ?? 0)}
                  </span>
                </td>
                <td className="p-3 bg-container border border-border text-sm hover:bg-accent">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("edit", loc);
                      }}
                      className="p-1 hover:bg-buttonActive/10 text-buttonActive"
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
                        onAction("delete", loc);
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
};

export default LocationTable;

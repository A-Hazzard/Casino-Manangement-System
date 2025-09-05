"use client";

import { useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { LocationTableProps } from "@/lib/types/location";

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
          <thead className="bg-[#00b517] text-white">
            <tr>
              <th
                className="p-3 border border-[#00b517] text-sm relative cursor-pointer"
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
                className="p-3 border border-[#00b517] text-sm relative cursor-pointer"
                onClick={() => onSort("moneyIn")}
              >
                <span>HANDLE</span>
                {sortOption === "moneyIn" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-[#00b517] text-sm relative cursor-pointer"
                onClick={() => onSort("moneyOut")}
              >
                <span>CANCELLED</span>
                {sortOption === "moneyOut" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-[#00b517] text-sm relative cursor-pointer"
                onClick={() => onSort("jackpot")}
              >
                <span>JACKPOT</span>
                {sortOption === "jackpot" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </th>
              <th
                className="p-3 border border-[#00b517] text-sm relative cursor-pointer"
                onClick={() => onSort("gross")}
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
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-left hover:bg-accent">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {loc.locationName || "Unknown Location"}
                    </span>
                  </div>
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  {formatCurrency(loc.moneyIn || 0)}
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  {formatCurrency(loc.moneyOut || 0)}
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  {formatCurrency(loc.jackpot || 0)}
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  <span className="text-green-600 font-semibold">
                    {formatCurrency(loc.gross || 0)}
                  </span>
                </td>
                <td className="p-3 bg-white border-2 border-gray-200 text-sm text-center hover:bg-accent">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("edit", loc);
                      }}
                      className="p-1 h-8 w-8 hover:bg-accent"
                    >
                      <Image
                        src={editIcon}
                        alt="Edit"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction("delete", loc);
                      }}
                      className="p-1 h-8 w-8 hover:bg-accent"
                    >
                      <Image
                        src={deleteIcon}
                        alt="Delete"
                        width={16}
                        height={16}
                        className="w-4 h-4"
                      />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
};

export default LocationTable;

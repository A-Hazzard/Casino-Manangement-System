"use client";

import { useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <Table ref={tableRef} className="table-fixed w-full">
          <TableHeader>
            <TableRow className="bg-[#00b517] hover:bg-[#00b517]">
              <TableHead
                className="text-white font-semibold cursor-pointer relative"
                onClick={() => onSort("name")}
                isFirstColumn={true}
              >
                <span>LOCATION NAME</span>
                {sortOption === "name" && (
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
                onClick={() => onSort("gross")}
              >
                <span>GROSS</span>
                {sortOption === "gross" && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs sort-icon">
                    {sortOrder === "desc" ? "▼" : "▲"}
                  </span>
                )}
              </TableHead>
              <TableHead className="text-white font-semibold">
                ACTIONS
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {locations.map((loc) => {
              const location = loc as Record<string, unknown>;
              return (
                <TableRow
                  key={location.locationName as string}
                  className="cursor-pointer hover:bg-muted"
                  onClick={(e) => {
                    if (!(e.target as HTMLElement).closest("td:last-child")) {
                      handleRowClick(location.location as string);
                    }
                  }}
                >
                  <TableCell isFirstColumn={true}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {(location.locationName as string) ||
                          "Unknown Location"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(loc.moneyIn || 0)}</TableCell>
                  <TableCell>{formatCurrency(loc.moneyOut || 0)}</TableCell>
                  <TableCell>
                    <span className="text-green-600 font-semibold">
                      {formatCurrency(loc.gross || 0)}
                    </span>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};

export default LocationTable;

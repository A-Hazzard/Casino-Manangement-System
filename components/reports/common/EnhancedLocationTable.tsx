"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { AggregatedLocation } from "@/shared/types/entities";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  DoubleArrowLeftIcon,
  DoubleArrowRightIcon,
} from "@radix-ui/react-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type EnhancedLocationTableProps = {
  locations: AggregatedLocation[];
  onLocationClick?: (locationId: string) => void;
  className?: string;
  loading?: boolean;
  error?: string | null;
  // Pagination props
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
};

type SortField =
  | "locationName"
  | "sasStatus"
  | "totalMachines"
  | "moneyIn"
  | "moneyOut"
  | "gross"
  | "holdPercentage"
  | "gamesPlayed";
type SortOrder = "asc" | "desc";

export default function EnhancedLocationTable({
  locations,
  onLocationClick,
  className = "",
  loading = false,
  error = null,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  itemsPerPage = 10,
}: EnhancedLocationTableProps) {
  const [sortField, setSortField] = useState<SortField>("moneyIn");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [searchTerm, setSearchTerm] = useState("");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const filteredLocations = locations.filter((location) => {
    const q = searchTerm.toLowerCase();
    const name = location.locationName || "";
    const id = (location as Record<string, unknown>).location as string || "";
    return (
      (typeof name === "string" && name.toLowerCase().includes(q)) ||
      (typeof id === "string" && id.toLowerCase().includes(q))
    );
  });

  const sortedLocations = [...filteredLocations].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case "locationName":
        aValue = a.locationName || "";
        bValue = b.locationName || "";
        break;
      case "sasStatus":
        aValue = a.hasSasMachines ? 1 : 0;
        bValue = b.hasSasMachines ? 1 : 0;
        break;
      case "totalMachines":
        aValue = a.totalMachines || 0;
        bValue = b.totalMachines || 0;
        break;
      case "moneyIn":
        aValue = a.moneyIn || 0;
        bValue = b.moneyIn || 0;
        break;
      case "moneyOut":
        aValue = a.moneyOut || 0;
        bValue = b.moneyOut || 0;
        break;
      case "gross":
        aValue = a.gross || 0;
        bValue = b.gross || 0;
        break;
      case "holdPercentage":
        aValue = a.moneyIn > 0 ? (a.gross / a.moneyIn) * 100 : 0;
        bValue = b.moneyIn > 0 ? (b.gross / b.moneyIn) * 100 : 0;
        break;
      case "gamesPlayed":
        aValue = a.gamesPlayed || 0;
        bValue = b.gamesPlayed || 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-US").format(num);
  };

  // Mobile Card Component
  const LocationCard = ({ location }: { location: AggregatedLocation }) => {
    const holdPercentage =
      location.moneyIn > 0 ? (location.gross / location.moneyIn) * 100 : 0;
    const avgWagerPerGame =
      location.gamesPlayed > 0 ? location.moneyIn / location.gamesPlayed : 0;

    return (
      <Card 
        className={`mb-4 cursor-pointer hover:shadow-md transition-shadow ${
          onLocationClick ? "cursor-pointer" : ""
        }`}
        onClick={() => onLocationClick?.(location.location)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            <span className="truncate">{location.locationName}</span>
            <Badge 
              variant={location.hasSasMachines ? "default" : "secondary"}
              className="ml-2"
            >
              {location.hasSasMachines ? "SAS" : "Non-SAS"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Machines:</span>
              <span className="ml-2 font-medium">{location.totalMachines}</span>
            </div>
            <div>
              <span className="text-gray-500">Games Played:</span>
              <span className="ml-2 font-medium">{formatNumber(location.gamesPlayed)}</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Drop (Money In):</span>
              <span className="font-medium text-green-600">{formatCurrency(location.moneyIn)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cancelled Credits:</span>
              <span className="font-medium text-red-600">{formatCurrency(location.moneyOut)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Revenue:</span>
              <span className="font-medium text-blue-600">{formatCurrency(location.gross)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hold %:</span>
              <span className="font-medium">{holdPercentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg. Wager per Game:</span>
              <span className="font-medium">{formatCurrency(avgWagerPerGame)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Table Skeleton Component
  const TableSkeleton = () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="h-16 bg-gray-200 rounded-lg"></div>
        </div>
      ))}
    </div>
  );

  // Pagination Component
  const Pagination = () => {
    if (totalPages <= 1) return null;

    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    return (
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 sm:px-6">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing {((currentPage - 1) * itemsPerPage) + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount}{" "}
            results
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(1)}
            disabled={currentPage === 1}
          >
            <DoubleArrowLeftIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </Button>
          {[...Array(endPage - startPage + 1)].map((_, i) => {
            const page = startPage + i;
            return (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange?.(page)}
              >
                {page}
              </Button>
            );
          })}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRightIcon className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(totalPages)}
            disabled={currentPage === totalPages}
          >
            <DoubleArrowRightIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-4">
          <TableSkeleton />
        </div>
      ) : error ? (
        <div className="text-center py-8">
          <div className="text-red-500 text-sm mb-2">
            Error loading locations
          </div>
          <div className="text-gray-500 text-sm">{error}</div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="md:hidden p-4">
            {sortedLocations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No locations found
              </div>
            ) : (
              <div className="space-y-4">
                {sortedLocations.map((location) => (
                  <LocationCard key={location.location} location={location} />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("locationName")}
                    >
                      <div className="flex items-center gap-1">
                        Location Name
                        {getSortIcon("locationName")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("sasStatus")}
                    >
                      <div className="flex items-center gap-1">
                        SAS Status
                        {getSortIcon("sasStatus")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("totalMachines")}
                    >
                      <div className="flex items-center gap-1">
                        Machines
                        {getSortIcon("totalMachines")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("moneyIn")}
                    >
                      <div className="flex items-center gap-1">
                        Drop (Money In)
                        {getSortIcon("moneyIn")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("moneyOut")}
                    >
                      <div className="flex items-center gap-1">
                        Cancelled Credits (Money Out)
                        {getSortIcon("moneyOut")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("gross")}
                    >
                      <div className="flex items-center gap-1">
                        Gross Revenue
                        {getSortIcon("gross")}
                      </div>
                    </th>
                    <th
                      className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort("holdPercentage")}
                    >
                      <div className="flex items-center gap-1">
                        Hold %{getSortIcon("holdPercentage")}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Games Played
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. Wager per Game
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedLocations.map((location) => {
                    const holdPercentage =
                      location.moneyIn > 0
                        ? (location.gross / location.moneyIn) * 100
                        : 0;
                    const avgWagerPerGame =
                      location.gamesPlayed > 0
                        ? location.moneyIn / location.gamesPlayed
                        : 0;

                    return (
                      <tr
                        key={location.location}
                        className={`hover:bg-gray-50 ${
                          onLocationClick ? "cursor-pointer" : ""
                        }`}
                        onClick={() => onLocationClick?.(location.location)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {location.locationName}
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Badge
                            variant={location.hasSasMachines ? "default" : "secondary"}
                          >
                            {location.hasSasMachines ? "SAS" : "Non-SAS"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {location.totalMachines}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(location.moneyIn)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-red-600 font-medium">
                          {formatCurrency(location.moneyOut)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {formatCurrency(location.gross)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {holdPercentage.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatNumber(location.gamesPlayed)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(avgWagerPerGame)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      {onPageChange && <Pagination />}
    </div>
  );
}

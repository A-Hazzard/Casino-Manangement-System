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

type SortField = "locationName" | "sasStatus" | "totalMachines" | "moneyIn" | "gross" | "holdPercentage" | "gamesPlayed";
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
  console.log("🔍 EnhancedLocationTable - loading:", loading, "locations count:", locations.length, "totalPages:", totalPages, "totalCount:", totalCount);
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

  const filteredLocations = locations.filter(location =>
    location.locationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.location.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedLocations = [...filteredLocations].sort((a, b) => {
    let aValue: any;
    let bValue: any;

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
      case "gross":
        aValue = a.gross || 0;
        bValue = b.gross || 0;
        break;
      case "holdPercentage":
        aValue = a.moneyIn > 0 ? (a.gross / a.moneyIn) * 100 : 0;
        bValue = b.moneyIn > 0 ? (b.gross / b.moneyIn) * 100 : 0;
        break;
      case "gamesPlayed":
        // This would need to be added to the AggregatedLocation type
        aValue = 0;
        bValue = 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortOrder === "asc" 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    return sortOrder === "asc" ? aValue - bValue : bValue - aValue;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  // Skeleton loading component for table view
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="p-4">
        <div className="text-sm text-gray-500 mb-4">Loading location data...</div>
      </div>
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/6"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-12"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-12"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Skeleton loading component for card view
  const CardSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="p-4">
        <div className="text-sm text-gray-500 mb-4">Loading location data...</div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-20"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-4 bg-gray-300 rounded w-20"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-300 rounded w-16"></div>
              <div className="h-4 bg-gray-300 rounded w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  // Card component for mobile view
  const LocationCard = ({ location }: { location: AggregatedLocation }) => {
    const holdPercentage = location.moneyIn > 0 ? (location.gross / location.moneyIn) * 100 : 0;
    
    return (
      <div 
        className={`bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow ${
          onLocationClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onLocationClick?.(location.location)}
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {location.locationName}
            </h3>
            <p className="text-xs text-gray-500 truncate">
              {location.location}
            </p>
          </div>
          <Badge 
            variant={location.hasSasMachines ? "default" : "secondary"}
            className={`text-xs ${
              location.hasSasMachines 
                ? 'bg-green-100 text-green-700' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {location.hasSasMachines ? 'SAS' : 'Non-SAS'}
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Machines</p>
            <p className="text-sm font-medium text-gray-900">
              {formatNumber(location.totalMachines)}
              <span className="text-xs text-gray-500 ml-1">
                ({location.onlineMachines} online)
              </span>
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Handle</p>
            <p className="text-sm font-medium text-gray-900">
              {formatCurrency(location.moneyIn)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Win/Loss</p>
            <p className={`text-sm font-medium ${
              location.gross >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatCurrency(location.gross)}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Hold %</p>
            <p className={`text-sm font-medium ${
              holdPercentage >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {holdPercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Jackpot: $0</span>
            <span>Avg Wager: $0</span>
            <span>Games: 0</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Search Bar */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block overflow-x-auto">
        {loading ? (
          <TableSkeleton />
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-sm mb-2">Error loading locations</div>
            <div className="text-gray-500 text-sm">{error}</div>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("locationName")}
                  >
                    <div className="flex items-center gap-1">
                      Location Name
                      {getSortIcon("locationName")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("sasStatus")}
                  >
                    <div className="flex items-center gap-1">
                      SAS Status
                      {getSortIcon("sasStatus")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("totalMachines")}
                  >
                    <div className="flex items-center gap-1">
                      Machines
                      {getSortIcon("totalMachines")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("moneyIn")}
                  >
                    <div className="flex items-center gap-1">
                      Handle
                      {getSortIcon("moneyIn")}
                    </div>
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("gross")}
                  >
                    <div className="flex items-center gap-1">
                      Win/Loss
                      {getSortIcon("gross")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jackpot
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Avg. Wag. per Game
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort("holdPercentage")}
                  >
                    <div className="flex items-center gap-1">
                      Actual Hold
                      {getSortIcon("holdPercentage")}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Games Played
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedLocations.map((location) => {
                  const holdPercentage = location.moneyIn > 0 ? (location.gross / location.moneyIn) * 100 : 0;
                  
                  return (
                    <tr 
                      key={location.location}
                      className={`hover:bg-gray-50 ${onLocationClick ? 'cursor-pointer' : ''}`}
                      onClick={() => onLocationClick?.(location.location)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {location.locationName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {location.location}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge 
                          variant={location.hasSasMachines ? "default" : "secondary"}
                          className={`${
                            location.hasSasMachines 
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {location.hasSasMachines ? 'SAS Enabled' : 'Non-SAS'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {formatNumber(location.totalMachines)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {location.onlineMachines} online
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(location.moneyIn)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          location.gross >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(location.gross)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {/* Jackpot would need to be added to AggregatedLocation */}
                        $0
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {/* Avg wager per game would need to be calculated */}
                        $0
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-sm font-medium ${
                          holdPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {holdPercentage.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {/* Games played would need to be added to AggregatedLocation */}
                        0
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-4 space-y-4">
        {loading ? (
          <CardSkeleton />
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-red-500 text-sm mb-2">Error loading locations</div>
            <div className="text-gray-500 text-sm">{error}</div>
          </div>
        ) : (
          <>
            {sortedLocations.map((location) => (
              <LocationCard key={location.location} location={location} />
            ))}
          </>
        )}
      </div>

            {/* Pagination */}
            {onPageChange && totalCount > 0 && (
              <div className="mt-6 p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <DoubleArrowLeftIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-gray-700 text-sm">Page</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    let val = Number(e.target.value);
                    if (isNaN(val)) val = 1;
                    if (val < 1) val = 1;
                    if (val > totalPages) val = totalPages;
                    onPageChange(val);
                  }}
                  className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm text-gray-700 focus:ring-buttonActive focus:border-buttonActive"
                  aria-label="Page number"
                />
                <span className="text-gray-700 text-sm">
                  of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <ChevronRightIcon className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="bg-white border-button text-button hover:bg-button/10 disabled:opacity-50 disabled:text-gray-400 disabled:border-gray-300 p-2"
                >
                  <DoubleArrowRightIcon className="h-4 w-4" />
                </Button>
              </div>
              <div className="text-center mt-2 text-sm text-gray-600">
                Showing {locations.length} of {totalCount} locations
              </div>
            </div>
            )}

      {/* Empty State - Only show when not loading and no error */}
      {!loading && !error && sortedLocations.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-500 text-sm">
            {searchTerm ? 'No locations found matching your search.' : 'No locations found for the selected criteria.'}
          </div>
        </div>
      )}
    </div>
  );
} 
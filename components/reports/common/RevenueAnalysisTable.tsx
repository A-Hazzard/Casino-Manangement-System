"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  ArrowUpDown,
  MapPin,
  Monitor,
} from "lucide-react";
import { AggregatedLocation } from "@/lib/types/location";
import type { RevenueAnalysisTableProps } from "@/lib/types/components";

export default function RevenueAnalysisTable({
  locations,
  loading = false,
  error = null,
  currentPage = 1,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  onLocationClick,
}: RevenueAnalysisTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof AggregatedLocation>("gross");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Filter locations based on search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm?.trim()) return locations;
    const q = (searchTerm || "").toLowerCase();
    return locations.filter((location) => {
      const name = location.locationName || "";
      const id = (location as Record<string, unknown>)?.location as string || "";
      return (
        (typeof name === "string" && name.toLowerCase().includes(q)) ||
        (typeof id === "string" && id.toLowerCase().includes(q))
      );
    });
  }, [locations, searchTerm]);

  // Sort locations
  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];

      if (typeof aValue === "number" && typeof bValue === "number") {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === "string" && typeof bValue === "string") {
        return sortDirection === "asc"
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [filteredLocations, sortField, sortDirection]);

  // Paginate locations
  const paginatedLocations = useMemo(() => {
    const startIndex = (currentPage - 1) * 10;
    const endIndex = startIndex + 10;
    return sortedLocations.slice(startIndex, endIndex);
  }, [sortedLocations, currentPage]);

  const handleSort = (field: keyof AggregatedLocation) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: keyof AggregatedLocation;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-semibold hover:bg-transparent"
    >
      {children}
      <ArrowUpDown className="ml-1 h-4 w-4" />
    </Button>
  );

  // Skeleton loading component for table view
  const TableSkeleton = () => (
    <div className="animate-pulse">
      <div className="p-4">
        <div className="text-sm text-gray-500 mb-4">
          Loading location data...
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 p-4 border rounded-lg bg-gray-50"
          >
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-300 rounded w-1/4"></div>
              <div className="h-3 bg-gray-300 rounded w-1/6"></div>
            </div>
            <div className="h-6 bg-gray-300 rounded w-16"></div>
            <div className="h-4 bg-gray-300 rounded w-12"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-4 bg-gray-300 rounded w-20"></div>
            <div className="h-4 bg-gray-300 rounded w-16"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Skeleton loading component for card view
  const CardSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="p-4">
        <div className="text-sm text-gray-500 mb-4">
          Loading location data...
        </div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
        >
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
    return (
      <div
        className={`bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow ${
          onLocationClick ? "cursor-pointer" : ""
        }`}
        onClick={() => onLocationClick?.(location)}
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
          <Badge variant="secondary" className="text-xs font-mono">
            {location.totalMachines} machines
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Drop</p>
            <p className="text-sm font-medium text-gray-900">
              ${location.moneyIn.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Cancelled Credits</p>
            <p className="text-sm font-medium text-gray-900">
              ${location.moneyOut.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-xs text-gray-500">Gross Revenue</p>
            <p className="text-lg font-semibold text-green-600">
              ${location.gross.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Online: {location.onlineMachines}</span>
            <span>
              Hold:{" "}
              {location.moneyIn > 0
                ? ((location.gross / location.moneyIn) * 100).toFixed(1)
                : 0}
              %
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="hidden lg:block">
            <TableSkeleton />
          </div>
          <div className="lg:hidden">
            <CardSkeleton />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading data: {error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        {/* Search and Controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Monitor className="h-4 w-4" />
            <span>{filteredLocations.length} locations</span>
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden lg:block">
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="font-semibold">
                    <SortButton field="locationName">Location Name</SortButton>
                  </TableHead>
                  <TableHead className="font-semibold text-center">
                    <SortButton field="totalMachines">
                      Machine Numbers
                    </SortButton>
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    <SortButton field="moneyIn">Drop</SortButton>
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    <SortButton field="moneyOut">Cancelled Credits</SortButton>
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    <SortButton field="gross">Gross Revenue</SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLocations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      {searchTerm
                        ? "No locations found matching your search"
                        : "No locations available"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLocations.map((location) => (
                    <TableRow
                      key={location.locationName}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => onLocationClick?.(location)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          {location.locationName}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className="font-mono">
                          {location.totalMachines}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${location.moneyIn.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${location.moneyOut.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-green-600">
                        ${location.gross.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-4">
          {paginatedLocations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm
                ? "No locations found matching your search"
                : "No locations available"}
            </div>
          ) : (
            paginatedLocations.map((location) => (
              <LocationCard key={location.locationName} location={location} />
            ))
          )}
        </div>

        {/* Pagination - Fixed positioning to prevent overlap */}
        {totalPages > 1 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-600 text-center sm:text-left">
                Showing {(currentPage - 1) * 10 + 1} to{" "}
                {Math.min(currentPage * 10, totalCount)} of {totalCount}{" "}
                locations
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange?.(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                  {totalPages > 5 && (
                    <>
                      {currentPage > 3 && <span className="px-2">...</span>}
                      {currentPage > 3 && currentPage < totalPages - 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-8 h-8 p-0"
                        >
                          {currentPage}
                        </Button>
                      )}
                      {currentPage < totalPages - 2 && (
                        <span className="px-2">...</span>
                      )}
                      {currentPage < totalPages - 2 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPageChange?.(totalPages)}
                          className="w-8 h-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}


      </CardContent>
    </Card>
  );
}

/**
 * Reports Locations Revenue Table Component
 *
 * Displays detailed revenue analysis for locations in both desktop table and mobile card views
 *
 * Features:
 * - Search functionality
 * - Desktop table view with sortable headers
 * - Mobile card view
 * - Pagination controls
 * - Financial color coding
 *
 * @module components/reports/tabs/locations/ReportsLocationsRevenueTable
 */

'use client';

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import { Card, CardContent } from '@/components/shared/ui/card';
import { Input } from '@/components/shared/ui/input';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/shared/ui/table';
import type { ReportsLocationsRevenueTableProps } from '@/lib/types/components';
import { AggregatedLocation } from '@/lib/types/location';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financial';
import {
  ArrowUpDown,
  ExternalLink,
  MapPin,
  Monitor,
  Search,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

/**
 * Main ReportsLocationsRevenueTable Component
 */
export default function ReportsLocationsRevenueTable({
  locations,
  loading = false,
  error = null,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onLocationClick,
}: ReportsLocationsRevenueTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof AggregatedLocation | 'name'>(
    'name'
  );
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Calculate total machines across all locations for floor position calculation
  const totalMachinesAcrossAllLocations = useMemo(() => {
    return locations.reduce((sum, loc) => sum + (loc.totalMachines || 0), 0);
  }, [locations]);

  // Filter locations based on search term
  const filteredLocations = useMemo(() => {
    if (!searchTerm?.trim()) return locations;
    const q = (searchTerm || '').toLowerCase().trim();
    return locations.filter(location => {
      const name = String(
        (location as Record<string, unknown>).name ||
          (location as Record<string, unknown>).locationName ||
          ''
      ).toLowerCase();
      const id = String(
        (location as Record<string, unknown>)._id ||
          (location as Record<string, unknown>).location ||
          ''
      ).toLowerCase();
      return name.includes(q) || id.includes(q);
    });
  }, [locations, searchTerm]);

  // Sort locations
  const sortedLocations = useMemo(() => {
    return [...filteredLocations].sort((a, b) => {
      const aVal = (a as Record<string, unknown>)[sortField];
      const bVal = (b as Record<string, unknown>)[sortField];

      let aValue =
        aVal === undefined && sortField === 'name'
          ? (a as Record<string, unknown>).locationName
          : aVal;
      let bValue =
        bVal === undefined && sortField === 'name'
          ? (b as Record<string, unknown>).locationName
          : bVal;

      // Handle special cases for calculated fields
      if (sortField === 'coinIn') {
        aValue = (a as AggregatedLocation).coinIn || 0;
        bValue = (b as AggregatedLocation).coinIn || 0;
      } else if (sortField === 'jackpot') {
        aValue = (a as AggregatedLocation).jackpot || 0;
        bValue = (b as AggregatedLocation).jackpot || 0;
      } else if (sortField === 'gamesPlayed') {
        aValue = (a as AggregatedLocation).gamesPlayed || 0;
        bValue = (b as AggregatedLocation).gamesPlayed || 0;
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return 0;
    });
  }, [filteredLocations, sortField, sortDirection]);

  // Use sorted locations - sorting is applied here, pagination is handled by parent
  const paginatedLocations = sortedLocations;

  const handleSort = (field: keyof AggregatedLocation | 'name') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortButton = ({
    field,
    children,
  }: {
    field: keyof AggregatedLocation | 'name';
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
        <div className="mb-4 text-sm text-gray-500">
          Loading location data...
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(10)].map((_, i) => (
          <div
            key={i}
            className="flex items-center space-x-4 rounded-lg border bg-gray-50 p-4"
          >
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/4 rounded bg-gray-300"></div>
              <div className="h-3 w-1/6 rounded bg-gray-300"></div>
            </div>
            <div className="h-6 w-16 rounded bg-gray-300"></div>
            <div className="h-4 w-12 rounded bg-gray-300"></div>
            <div className="h-4 w-20 rounded bg-gray-300"></div>
            <div className="h-4 w-20 rounded bg-gray-300"></div>
            <div className="h-4 w-16 rounded bg-gray-300"></div>
          </div>
        ))}
      </div>
    </div>
  );

  // Skeleton loading component for card view
  const CardSkeleton = () => (
    <div className="animate-pulse space-y-4">
      <div className="p-4">
        <div className="mb-4 text-sm text-gray-500">
          Loading location data...
        </div>
      </div>
      {[...Array(6)].map((_, i) => (
        <div
          key={i}
          className="space-y-3 rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 rounded bg-gray-300"></div>
              <div className="h-4 w-1/2 rounded bg-gray-300"></div>
            </div>
            <div className="h-6 w-20 rounded bg-gray-300"></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-gray-300"></div>
              <div className="h-4 w-20 rounded bg-gray-300"></div>
            </div>
            <div className="space-y-2">
              <div className="h-4 w-16 rounded bg-gray-300"></div>
              <div className="h-4 w-20 rounded bg-gray-300"></div>
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
        className={`space-y-3 rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md ${
          onLocationClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onLocationClick?.(location)}
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {(() => {
              // Get location ID - try multiple possible fields
              const locationId =
                (location as Record<string, unknown>).location ||
                location._id ||
                (location as Record<string, unknown>).locationId;
              const locationName: string = String(
                (location as Record<string, unknown>).name ||
                  (location as Record<string, unknown>).locationName ||
                  'Unknown'
              );

              if (locationId) {
                return (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      window.location.href = `/locations/${String(locationId)}`;
                    }}
                    className="group flex items-center gap-1.5 text-left"
                  >
                    <h3 className="truncate text-sm font-medium text-gray-900 underline decoration-blue-600 decoration-2 underline-offset-2">
                      {locationName}
                    </h3>
                    <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                  </button>
                );
              }

              return (
                <h3 className="truncate text-sm font-medium text-gray-900">
                  {locationName}
                </h3>
              );
            })()}
            <p className="truncate text-xs text-gray-500">
              {String(
                (location as Record<string, unknown>).location ||
                  location._id ||
                  (location as Record<string, unknown>).locationId ||
                  ''
              )}
            </p>
          </div>
          <Badge variant="secondary" className="font-mono text-xs">
            {location.totalMachines} machines
          </Badge>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Drop</p>
            <p className={`text-sm font-medium ${getMoneyInColorClass()}`}>
              ${location.moneyIn.toLocaleString()}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-gray-500">Cancelled Credits</p>
            <p
              className={`text-sm font-medium ${getMoneyOutColorClass(location.moneyOut, location.moneyIn)}`}
            >
              ${location.moneyOut.toLocaleString()}
            </p>
          </div>
          <div className="col-span-2 space-y-1">
            <p className="text-xs text-gray-500">Gross Revenue</p>
            <p
              className={`text-lg font-semibold ${getGrossColorClass(location.gross)}`}
            >
              ${location.gross.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Additional Info */}
        <div className="border-t border-gray-100 pt-2">
          <div className="flex justify-between text-xs text-gray-500">
            <span>Online: {location.onlineMachines}</span>
            <span>
              Hold:{' '}
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
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
            <Input
              placeholder="Search locations..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
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
                    <SortButton field="name">Location Name</SortButton>
                  </TableHead>
                  <TableHead className="text-center font-semibold">
                    <SortButton field="totalMachines">
                      Machine Numbers
                    </SortButton>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <SortButton field="moneyIn">Drop</SortButton>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <SortButton field="moneyOut">Cancelled Credits</SortButton>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <SortButton field="gross">Gross Revenue</SortButton>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Floor Position %
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <SortButton field="coinIn">Handle</SortButton>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Win
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <SortButton field="jackpot">Jackpot</SortButton>
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    <SortButton field="gamesPlayed">Plays</SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLocations.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-8 text-center text-gray-500"
                    >
                      {searchTerm
                        ? 'No locations found matching your search'
                        : 'No locations available'}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedLocations.map(location => {
                    const floorPosition =
                      totalMachinesAcrossAllLocations > 0
                        ? ((location.totalMachines || 0) /
                            totalMachinesAcrossAllLocations) *
                          100
                        : 0;
                    const netWin =
                      (location.coinIn || 0) - (location.coinOut || 0);
                    return (
                      <TableRow
                        key={String(
                          (location as Record<string, unknown>)._id ||
                            (location as Record<string, unknown>).location ||
                            (location as Record<string, unknown>).name ||
                            (location as Record<string, unknown>)
                              .locationName ||
                            ''
                        )}
                        className="cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => onLocationClick?.(location)}
                      >
                        <TableCell className="font-medium">
                          {(() => {
                            // Get location ID - try multiple possible fields
                            const locationId =
                              (location as Record<string, unknown>).location ||
                              location._id ||
                              (location as Record<string, unknown>).locationId;
                            const locationName: string = String(
                              location.name ||
                                (location as Record<string, unknown>)
                                  .locationName ||
                                'Unknown'
                            );

                            if (locationId) {
                              return (
                                <button
                                  onClick={e => {
                                    e.stopPropagation();
                                    window.location.href = `/locations/${String(locationId)}`;
                                  }}
                                  className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-80"
                                >
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                    {locationName}
                                  </span>
                                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                                </button>
                              );
                            }

                            return (
                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                {locationName}
                              </div>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono">
                            {location.totalMachines}
                          </Badge>
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${getMoneyInColorClass()}`}
                        >
                          ${location.moneyIn.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${getMoneyOutColorClass(location.moneyOut, location.moneyIn)}`}
                        >
                          ${location.moneyOut.toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono font-semibold ${getGrossColorClass(location.gross)}`}
                        >
                          ${location.gross.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {floorPosition.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${(location.coinIn || 0).toLocaleString()}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${getGrossColorClass(netWin)}`}
                        >
                          ${netWin.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${(location.jackpot || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {(location.gamesPlayed || 0).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card View */}
        <div className="space-y-4 lg:hidden">
          {paginatedLocations.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              {searchTerm
                ? 'No locations found matching your search'
                : 'No locations available'}
            </div>
          ) : (
            paginatedLocations.map(location => (
              <LocationCard
                key={String(
                  (location as Record<string, unknown>)._id ||
                    (location as Record<string, unknown>).location ||
                    (location as Record<string, unknown>).name ||
                    (location as Record<string, unknown>).locationName ||
                    ''
                )}
                location={location}
              />
            ))
          )}
        </div>

        {/* Pagination - Use standard PaginationControls */}
        {onPageChange && totalPages > 1 && (
          <div className="mt-8 border-t border-gray-200 pt-6">
            <PaginationControls
              currentPage={currentPage - 1}
              totalPages={totalPages}
              setCurrentPage={page => onPageChange(page + 1)}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}


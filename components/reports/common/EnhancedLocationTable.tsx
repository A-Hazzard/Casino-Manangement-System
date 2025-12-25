'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PaginationControls from '@/components/ui/PaginationControls';
import {
  getGrossColorClass,
  getMoneyInColorClass,
  getMoneyOutColorClass,
} from '@/lib/utils/financialColors';
import { AggregatedLocation } from '@/shared/types/entities';
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Home,
  Search,
  Server,
} from 'lucide-react';
import { useState } from 'react';

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
  | 'locationName'
  | 'sasStatus'
  | 'totalMachines'
  | 'moneyIn'
  | 'moneyOut'
  | 'gross'
  | 'holdPercentage'
  | 'gamesPlayed';
type SortOrder = 'asc' | 'desc';

export default function EnhancedLocationTable({
  locations,
  onLocationClick,
  className = '',
  loading = false,
  error = null,
  currentPage = 1,
  totalPages = 1,
  onPageChange,
}: EnhancedLocationTableProps) {
  const [sortField, setSortField] = useState<SortField>('moneyIn');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const filteredLocations = locations.filter(location => {
    const q = searchTerm.toLowerCase();
    const name = location.locationName || '';
    const id = ((location as Record<string, unknown>).location as string) || '';
    return (
      (typeof name === 'string' && name.toLowerCase().includes(q)) ||
      (typeof id === 'string' && id.toLowerCase().includes(q))
    );
  });

  const sortedLocations = [...filteredLocations].sort((a, b) => {
    let aValue: string | number;
    let bValue: string | number;

    switch (sortField) {
      case 'locationName':
        aValue = a.locationName || '';
        bValue = b.locationName || '';
        break;
      case 'sasStatus':
        aValue = a.hasSasMachines ? 1 : 0;
        bValue = b.hasSasMachines ? 1 : 0;
        break;
      case 'totalMachines':
        aValue = a.totalMachines || 0;
        bValue = b.totalMachines || 0;
        break;
      case 'moneyIn':
        aValue = a.moneyIn || 0;
        bValue = b.moneyIn || 0;
        break;
      case 'moneyOut':
        aValue = a.moneyOut || 0;
        bValue = b.moneyOut || 0;
        break;
      case 'gross':
        aValue = a.gross || 0;
        bValue = b.gross || 0;
        break;
      case 'holdPercentage':
        aValue = a.moneyIn > 0 ? (a.gross / a.moneyIn) * 100 : 0;
        bValue = b.moneyIn > 0 ? (b.gross / b.moneyIn) * 100 : 0;
        break;
      case 'gamesPlayed':
        aValue = a.gamesPlayed || 0;
        bValue = b.gamesPlayed || 0;
        break;
      default:
        aValue = 0;
        bValue = 0;
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="h-4 w-4" />
    ) : (
      <ChevronDown className="h-4 w-4" />
    );
  };

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

  // Mobile Card Component
  const LocationCard = ({ location }: { location: AggregatedLocation }) => {
    const holdPercentage =
      location.moneyIn > 0 ? (location.gross / location.moneyIn) * 100 : 0;
    const avgWagerPerGame =
      location.gamesPlayed > 0 ? location.moneyIn / location.gamesPlayed : 0;

    return (
      <Card
        className={`mb-4 cursor-pointer transition-shadow hover:shadow-md ${
          onLocationClick ? 'cursor-pointer' : ''
        }`}
        onClick={() => onLocationClick?.(location.location)}
      >
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between gap-2 text-lg">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {location.location ? (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    window.location.href = `/locations/${location.location}`;
                  }}
                  className="group flex items-center gap-1.5"
                >
                  <span className="truncate underline decoration-blue-600 decoration-2 underline-offset-2">
                    {location.locationName}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                </button>
              ) : (
                <span className="truncate">{location.locationName}</span>
              )}
              {/* SMIB Icon - Show if location has SMIB machines */}
              {Boolean(
                (location as { hasSmib?: boolean }).hasSmib ||
                  !(location as { noSMIBLocation?: boolean }).noSMIBLocation
              ) && (
                <div className="group relative inline-flex flex-shrink-0">
                  <Server className="h-4 w-4 text-blue-600" />
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    SMIB Location
                  </div>
                </div>
              )}
              {/* Local Server Icon */}
              {Boolean(
                (location as { isLocalServer?: boolean }).isLocalServer
              ) && (
                <div className="group relative inline-flex flex-shrink-0">
                  <Home className="h-4 w-4 text-purple-600" />
                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                    Local Server
                  </div>
                </div>
              )}
            </div>
            <Badge
              variant={location.hasSasMachines ? 'default' : 'secondary'}
              className="ml-2 flex-shrink-0"
            >
              {location.hasSasMachines ? 'SAS' : 'Non-SAS'}
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
              <span className="ml-2 font-medium">
                {formatNumber(location.gamesPlayed)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Drop (Money In):</span>
              <span
                className={`font-medium ${getMoneyInColorClass()}`}
              >
                {formatCurrency(location.moneyIn)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cancelled Credits:</span>
              <span
                className={`font-medium ${getMoneyOutColorClass(location.moneyOut, location.moneyIn)}`}
              >
                {formatCurrency(location.moneyOut)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Gross Revenue:</span>
              <span
                className={`font-medium ${getGrossColorClass(location.gross)}`}
              >
                {formatCurrency(location.gross)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Hold %:</span>
              <span className="font-medium">{holdPercentage.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Avg. Wager per Game:</span>
              <span className="font-medium">
                {formatCurrency(avgWagerPerGame)}
              </span>
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
          <div className="h-16 rounded-lg bg-gray-200"></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={`rounded-lg bg-white shadow ${className}`}>
      {/* Search Bar */}
      <div className="border-b border-gray-200 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-gray-400" />
          <Input
            type="text"
            placeholder="Search locations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
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
        <div className="py-8 text-center">
          <div className="mb-2 text-sm text-red-500">
            Error loading locations
          </div>
          <div className="text-sm text-gray-500">{error}</div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="p-4 md:hidden">
            {sortedLocations.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No locations found
              </div>
            ) : (
              <div className="space-y-4">
                {sortedLocations.map(location => (
                  <LocationCard key={location.location} location={location} />
                ))}
              </div>
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th
                      className="cursor-pointer px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('locationName')}
                    >
                      <div className="flex items-center gap-1">
                        Location Name
                        {getSortIcon('locationName')}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('sasStatus')}
                    >
                      <div className="flex items-center gap-1">
                        SAS Status
                        {getSortIcon('sasStatus')}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('totalMachines')}
                    >
                      <div className="flex items-center gap-1">
                        Machines
                        {getSortIcon('totalMachines')}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('moneyIn')}
                    >
                      <div className="flex items-center gap-1">
                        Drop (Money In)
                        {getSortIcon('moneyIn')}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('moneyOut')}
                    >
                      <div className="flex items-center gap-1">
                        Cancelled Credits (Money Out)
                        {getSortIcon('moneyOut')}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('gross')}
                    >
                      <div className="flex items-center gap-1">
                        Gross Revenue
                        {getSortIcon('gross')}
                      </div>
                    </th>
                    <th
                      className="cursor-pointer px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500 hover:bg-gray-100"
                      onClick={() => handleSort('holdPercentage')}
                    >
                      <div className="flex items-center gap-1">
                        Hold %{getSortIcon('holdPercentage')}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Games Played
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      Avg. Wager per Game
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {sortedLocations.map(location => {
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
                          onLocationClick ? 'cursor-pointer' : ''
                        }`}
                        onClick={() => onLocationClick?.(location.location)}
                      >
                        <td className="whitespace-nowrap px-4 py-3 text-center">
                          {location.location ? (
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                window.location.href = `/locations/${location.location}`;
                              }}
                              className="group mx-auto flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-80"
                            >
                              <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                {location.locationName}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                              {/* SMIB Icon - Show if location has SMIB machines */}
                              {Boolean(
                                (location as { hasSmib?: boolean }).hasSmib ||
                                  !(location as { noSMIBLocation?: boolean })
                                    .noSMIBLocation
                              ) && (
                                <div className="group relative inline-flex flex-shrink-0">
                                  <Server className="h-4 w-4 text-blue-600" />
                                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                    SMIB Location
                                  </div>
                                </div>
                              )}
                              {/* Local Server Icon */}
                              {Boolean(
                                (location as { isLocalServer?: boolean })
                                  .isLocalServer
                              ) && (
                                <div className="group relative inline-flex flex-shrink-0">
                                  <Home className="h-4 w-4 text-purple-600" />
                                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                    Local Server
                                  </div>
                                </div>
                              )}
                            </button>
                          ) : (
                            <div className="flex items-center justify-center gap-1.5 text-sm font-medium text-gray-900">
                              <span>{location.locationName}</span>
                              {/* SMIB Icon - Show if location has SMIB machines */}
                              {Boolean(
                                (location as { hasSmib?: boolean }).hasSmib ||
                                  !(location as { noSMIBLocation?: boolean })
                                    .noSMIBLocation
                              ) && (
                                <div className="group relative inline-flex flex-shrink-0">
                                  <Server className="h-4 w-4 text-blue-600" />
                                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                    SMIB Location
                                  </div>
                                </div>
                              )}
                              {/* Local Server Icon */}
                              {Boolean(
                                (location as { isLocalServer?: boolean })
                                  .isLocalServer
                              ) && (
                                <div className="group relative inline-flex flex-shrink-0">
                                  <Home className="h-4 w-4 text-purple-600" />
                                  <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                    Local Server
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <Badge
                            variant={
                              location.hasSasMachines ? 'default' : 'secondary'
                            }
                          >
                            {location.hasSasMachines ? 'SAS' : 'Non-SAS'}
                          </Badge>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-center text-sm font-medium text-gray-900">
                          {location.totalMachines}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${getMoneyInColorClass()}`}
                        >
                          {formatCurrency(location.moneyIn)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${getMoneyOutColorClass(location.moneyOut, location.moneyIn)}`}
                        >
                          {formatCurrency(location.moneyOut)}
                        </td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${getGrossColorClass(location.gross)}`}
                        >
                          {formatCurrency(location.gross)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {holdPercentage.toFixed(2)}%
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                          {formatNumber(location.gamesPlayed)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
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

      {/* Pagination - Use standard PaginationControls if onPageChange provided */}
      {onPageChange && totalPages > 1 && (
        <div className="border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <PaginationControls
            currentPage={currentPage - 1}
            totalPages={totalPages}
            setCurrentPage={page => onPageChange(page + 1)}
          />
        </div>
      )}
    </div>
  );
}

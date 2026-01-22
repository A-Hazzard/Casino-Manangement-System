/**
 * Reports Machines Offline Tab Component
 *
 * Handles the offline machines tab with offline machine management
 *
 * @module components/reports/tabs/machines/ReportsMachinesOffline
 */

import { Badge } from '@/components/shared/ui/badge';
import { Button } from '@/components/shared/ui/button';
import CabinetsDeleteCabinetModal from '@/components/CMS/cabinets/modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from '@/components/CMS/cabinets/modals/CabinetsEditCabinetModal';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/shared/ui/card';
import LocationMultiSelect from '@/components/shared/ui/common/LocationMultiSelect';
import { Input } from '@/components/shared/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/shared/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { MachinesOfflineSkeleton } from '@/components/shared/ui/skeletons/ReportsSkeletons';
import {
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import React, { useMemo } from 'react';
import { getFinancialColorClass } from '@/lib/utils/financial';
import Image from 'next/image';
import editIcon from '@/public/editIcon.svg';
import deleteIcon from '@/public/deleteIcon.svg';
import { useRouter } from 'next/navigation';
import type { MachineData, ReportsMachinesOfflineProps } from '@/lib/types/reports';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import { calculateOfflineDurationHours } from '@/lib/helpers/machines';

// ============================================================================
// Internal Components
// ============================================================================

/**
 * Sortable table header component for offline machines
 */
const SortableHeader = ({
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: keyof MachineData | 'offlineDurationHours';
  currentSort: {
    key: keyof MachineData | 'offlineDurationHours';
    direction: 'asc' | 'desc';
  };
  onSort: (key: keyof MachineData | 'offlineDurationHours') => void;
}) => {
  const isActive = currentSort.key === sortKey;

  return (
    <th
      className="cursor-pointer select-none p-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-100"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-start gap-1">
        {children}
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <div className="h-4 w-4 opacity-30">
            <ChevronUp className="h-4 w-4" />
          </div>
        )}
      </div>
    </th>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const ReportsMachinesOffline = ({
  offlineMachines,
  locations,
  searchTerm,
  selectedLocations,
  selectedOfflineDuration,
  offlineLoading,
  machineStats,
  machineStatsLoading,
  offlinePagination,
  sortConfig,
  onSearchChange,
  onLocationChange,
  onDurationChange,
  onSort,
  onPageChange,
  onRefresh,
  onExport,
  onEdit,
  onDelete,
}: ReportsMachinesOfflineProps) => {
  const router = useRouter();

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Use independent machine stats API for all counts (independent of pagination)
  const offlineSummary = useMemo(() => {
    // Use machine stats API for all counts (independent of pagination)
    const totalOffline = machineStats?.offlineMachines || 0;
    const criticalOffline = machineStats?.criticalOffline || 0;
    const recentOffline = machineStats?.recentOffline || 0;

    // Only show summary if we have stats
    if (totalOffline === 0 && !machineStatsLoading) {
      return null;
    }

    return {
      totalOffline,
      criticalOffline,
      recentOffline,
      criticalPercentage: totalOffline > 0 ? (criticalOffline / totalOffline) * 100 : 0,
      recentPercentage: totalOffline > 0 ? (recentOffline / totalOffline) * 100 : 0,
    };
  }, [machineStats, machineStatsLoading]);

  // ============================================================================
  // Render
  // ============================================================================

  // Show message if no locations are selected
  if (selectedLocations.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Search offline machines..."
              value={searchTerm}
              onChange={e => onSearchChange(e.target.value)}
              className="w-full border-gray-300 text-gray-900 placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500"
              disabled
            />
          </div>
          <div className="w-full md:w-auto md:min-w-[280px] md:max-w-[280px]">
            <LocationMultiSelect
              locations={locations}
              selectedLocations={selectedLocations}
              onSelectionChange={onLocationChange}
              placeholder="Select locations..."
            />
          </div>
          <Select
            value={selectedOfflineDuration}
            onValueChange={onDurationChange}
            disabled
          >
            <SelectTrigger className="w-full border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500 md:w-40">
              <SelectValue
                placeholder="All Durations"
                className="text-gray-900"
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Durations</SelectItem>
              <SelectItem value="1h">1+ Hours</SelectItem>
              <SelectItem value="4h">4+ Hours</SelectItem>
              <SelectItem value="24h">24+ Hours</SelectItem>
              <SelectItem value="7d">7+ Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* No Location Selected Message */}
        <Card>
          <CardContent className="py-12 text-center">
            <div className="mb-2 text-lg text-gray-500">
              No Locations Selected
            </div>
            <div className="text-sm text-gray-400">
              Please select one or more locations above to view offline machines
              data
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Offline Summary Cards */}
      {!machineStatsLoading && offlineSummary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Offline
              </CardTitle>
              <Monitor className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {offlineSummary.totalOffline}
              </div>
              <p className="text-xs text-muted-foreground">
                Machines currently offline
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Critical Offline
              </CardTitle>
              <Badge variant="outline" className="text-red-600">
                {offlineSummary.criticalPercentage.toFixed(1)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {offlineSummary.criticalOffline}
              </div>
              <p className="text-xs text-muted-foreground">
                Offline for 24+ hours
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Recent Offline
              </CardTitle>
              <Badge variant="outline" className="text-yellow-600">
                {offlineSummary.recentPercentage.toFixed(1)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {offlineSummary.recentOffline}
              </div>
              <p className="text-xs text-muted-foreground">
                Offline for less than 4 hours
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <div className="flex-1 min-w-0">
          <Input
            placeholder="Search offline machines..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full border-gray-300 text-gray-900 placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="w-full md:w-auto md:min-w-[280px] md:max-w-[280px]">
          <LocationMultiSelect
            locations={locations}
            selectedLocations={selectedLocations}
            onSelectionChange={onLocationChange}
            placeholder="Select locations..."
          />
        </div>
        <Select
          value={selectedOfflineDuration}
          onValueChange={onDurationChange}
        >
          <SelectTrigger className="w-full border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500 md:w-40">
            <SelectValue
              placeholder="All Durations"
              className="text-gray-900"
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Durations</SelectItem>
            <SelectItem value="1h">1+ Hours</SelectItem>
            <SelectItem value="4h">4+ Hours</SelectItem>
            <SelectItem value="24h">24+ Hours</SelectItem>
            <SelectItem value="7d">7+ Days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Offline Machines Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Offline Machines</CardTitle>
              <CardDescription>
                Machines that are currently offline and require attention
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={offlineLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onExport('pdf')}
                className="cursor-pointer"
              >
                <FileText className="mr-2 h-4 w-4" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onExport('excel')}
                className="cursor-pointer"
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Export as Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
        </CardHeader>
        <CardContent>
          {offlineLoading ? (
            <MachinesOfflineSkeleton />
          ) : offlineMachines.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No offline machines found matching your criteria.
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <SortableHeader
                      sortKey="machineId"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Machine ID
                    </SortableHeader>
                    <SortableHeader
                      sortKey="gameTitle"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Game
                    </SortableHeader>
                    <SortableHeader
                      sortKey="locationName"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Location
                    </SortableHeader>
                    <SortableHeader
                      sortKey="lastActivity"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Last Online
                    </SortableHeader>
                    <SortableHeader
                      sortKey="offlineDurationHours"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Offline Duration
                    </SortableHeader>
                    <SortableHeader
                      sortKey="coinIn"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Handle
                    </SortableHeader>
                    <SortableHeader
                      sortKey="netWin"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Net Win
                    </SortableHeader>
                    <th className="p-3 text-center font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {offlineMachines.map(machine => {
                    const hoursOffline = calculateOfflineDurationHours(machine.lastActivity);
                    const lastOnlineDate = machine.lastActivity ? new Date(machine.lastActivity) : null;

                    return (
                      <tr
                        key={machine.machineId}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3 text-left">
                          <button
                            onClick={() => {
                              router.push(`/cabinets/${machine.machineId}`);
                            }}
                            className="group flex items-center gap-1.5 font-mono text-sm text-gray-900 transition-opacity hover:opacity-80"
                          >
                            <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                              {formatMachineDisplayNameWithBold({
                                serialNumber:
                                  machine.serialNumber || machine.machineId,
                                custom: { name: machine.machineName },
                                game: machine.gameTitle,
                              })}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                          </button>
                        </td>
                        <td className="p-3 text-left">
                          {machine.gameTitle || <span className="text-red-600">(game name not provided)</span>}
                        </td>
                        <td className="p-3 text-left">
                          <button
                            onClick={() => {
                              router.push(`/locations/${machine.locationId}`);
                            }}
                            className="group flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-80"
                          >
                            <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                              {machine.locationName || 'N/A'}
                            </span>
                            <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                          </button>
                        </td>
                        <td className="p-3 text-left">
                          {lastOnlineDate ? lastOnlineDate.toLocaleString() : 'Never'}
                        </td>
                        <td className="p-3 text-left">
                          <Badge
                            variant="outline"
                            className={
                              hoursOffline >= 168
                                ? 'border-red-600 text-red-600' // 7+ days
                                : hoursOffline >= 24
                                  ? 'border-orange-600 text-orange-600' // 24+ hours
                                  : hoursOffline >= 4
                                    ? 'border-yellow-600 text-yellow-600' // 4+ hours
                                    : 'border-green-600 text-green-600' // Less than 4 hours
                            }
                          >
                            {hoursOffline >= 168
                              ? `${Math.floor(hoursOffline / 24)}d`
                              : hoursOffline >= 24
                                ? `${Math.floor(hoursOffline)}h`
                                : hoursOffline >= 1
                                  ? `${Math.floor(hoursOffline * 60)}m`
                                  : 'Just now'}
                          </Badge>
                        </td>
                        <td className="p-3 text-left">
                          <span className={getFinancialColorClass(machine.coinIn)}>
                            ${machine.coinIn.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 text-left">
                          <span className={getFinancialColorClass(machine.netWin)}>
                            ${machine.netWin.toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onEdit(machine)}
                                className="h-8 w-8 p-1 hover:bg-accent"
                                title="Edit"
                              >
                                <Image
                                  src={editIcon}
                                  alt="Edit"
                                  width={16}
                                  height={16}
                                  className="h-4 w-4"
                                />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(machine)}
                                className="h-8 w-8 p-1 hover:bg-accent"
                                title="Delete"
                              >
                                <Image
                                  src={deleteIcon}
                                  alt="Delete"
                                  width={16}
                                  height={16}
                                  className="h-4 w-4"
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

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 lg:hidden">
                {offlineMachines.map(machine => {
                  const hoursOffline = calculateOfflineDurationHours(machine.lastActivity);
                  const lastOnlineDate = machine.lastActivity ? new Date(machine.lastActivity) : null;

                  return (
                    <Card
                      key={machine.machineId}
                      className="group relative overflow-hidden border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-5 shadow-sm transition-all hover:border-blue-300 hover:shadow-md"
                    >
                      {/* Header */}
                      <div className="mb-4 flex flex-col border-b border-gray-100 pb-3">
                        <div className="mb-2 flex items-center justify-between">
                          <Badge
                            variant="outline"
                            className={
                              hoursOffline >= 168
                                ? 'border-red-600 text-red-600' // 7+ days
                                : hoursOffline >= 24
                                  ? 'border-orange-600 text-orange-600' // 24+ hours
                                  : hoursOffline >= 4
                                    ? 'border-yellow-600 text-yellow-600' // 4+ hours
                                    : 'border-green-600 text-green-600' // Less than 4 hours
                            }
                          >
                            {hoursOffline >= 168
                              ? `${Math.floor(hoursOffline / 24)}d`
                              : hoursOffline >= 24
                                ? `${Math.floor(hoursOffline)}h`
                                : hoursOffline >= 1
                                  ? `${Math.floor(hoursOffline * 60)}m`
                                  : 'Just now'}
                          </Badge>
                        </div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <button
                              onClick={() => {
                                router.push(`/cabinets/${machine.machineId}`);
                              }}
                              className="group flex items-center gap-1.5 text-left"
                            >
                              <h3 className="break-words font-mono text-base font-semibold text-gray-900 underline decoration-blue-600 decoration-2 underline-offset-2">
                                {formatMachineDisplayNameWithBold({
                                  serialNumber:
                                    machine.serialNumber || machine.machineId,
                                  custom: { name: machine.machineName },
                                  game: machine.gameTitle,
                                })}
                              </h3>
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                            </button>
                            <p className="mt-1 truncate text-sm text-gray-600">
                              {machine.gameTitle || (
                                <span className="text-red-600">(game name not provided)</span>
                              )}
                            </p>
                            <button
                              onClick={() => {
                                router.push(`/locations/${machine.locationId}`);
                              }}
                              className="group mt-1 flex items-center gap-1.5 text-sm font-medium text-gray-900 transition-opacity hover:opacity-80"
                            >
                              <span className="underline decoration-blue-600 decoration-2 underline-offset-2">
                                {machine.locationName || 'N/A'}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-blue-600 group-hover:text-blue-700" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Last Online</p>
                          <p className="mt-1 text-sm font-semibold text-gray-900">
                            {lastOnlineDate ? lastOnlineDate.toLocaleString() : 'Never'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Handle</p>
                          <p className={`mt-1 text-sm font-semibold ${getFinancialColorClass(machine.coinIn)}`}>
                            ${machine.coinIn.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Net Win</p>
                          <p className={`mt-1 text-sm font-semibold ${getFinancialColorClass(machine.netWin)}`}>
                            ${machine.netWin.toLocaleString()}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Actions</p>
                          <div className="mt-1 flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEdit(machine)}
                              className="h-8 w-8 p-1 hover:bg-accent"
                              title="Edit"
                            >
                              <Image
                                src={editIcon}
                                alt="Edit"
                                width={16}
                                height={16}
                                className="h-4 w-4"
                              />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDelete(machine)}
                              className="h-8 w-8 p-1 hover:bg-accent"
                              title="Delete"
                            >
                              <Image
                                src={deleteIcon}
                                alt="Delete"
                                width={16}
                                height={16}
                                className="h-4 w-4"
                              />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                    );
                  })}
            </div>
            </>
          )}

          {/* Pagination */}
          {offlinePagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(offlinePagination.page - 1) * offlinePagination.limit + 1} to{' '}
                {Math.min(
                  offlinePagination.page * offlinePagination.limit,
                  offlinePagination.totalCount
                )}{' '}
                of {offlinePagination.totalCount} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(offlinePagination.page - 1)}
                  disabled={!offlinePagination.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(offlinePagination.page + 1)}
                  disabled={!offlinePagination.hasNextPage}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <CabinetsEditCabinetModal onCabinetUpdated={onRefresh} />
      <CabinetsDeleteCabinetModal onCabinetDeleted={onRefresh} />
    </div>
  );
};


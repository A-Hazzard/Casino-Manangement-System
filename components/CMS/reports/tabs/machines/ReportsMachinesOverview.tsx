/**
 * Reports Machines Overview Tab Component
 *
 * Handles the overview tab with machine statistics, charts, and table
 *
 * @module components/reports/tabs/machines/ReportsMachinesOverview
 */

import CabinetsDeleteCabinetModal from '@/components/CMS/cabinets/modals/CabinetsDeleteCabinetModal';
import CabinetsEditCabinetModal from '@/components/CMS/cabinets/modals/CabinetsEditCabinetModal';
import { Button } from '@/components/shared/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/shared/ui/card';
import LocationSingleSelect from '@/components/shared/ui/common/LocationSingleSelect';
import StatusIcon from '@/components/shared/ui/common/StatusIcon';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/shared/ui/dropdown-menu';
import { Input } from '@/components/shared/ui/input';
import { formatMachineDisplayNameWithBold } from '@/components/shared/ui/machineDisplay';
import PaginationControls from '@/components/shared/ui/PaginationControls';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/shared/ui/select';
import {
    MachinesOverviewSkeleton,
    MetricCardsSkeleton,
} from '@/components/shared/ui/skeletons/ReportsSkeletons';
import type {
    MachineData,
    ReportsMachinesOverviewProps,
} from '@/lib/types/reports';
import { getFinancialColorClass } from '@/lib/utils/financial';
import { Pencil2Icon } from '@radix-ui/react-icons';
import {
    BarChart3,
    ChevronDown,
    ChevronUp,
    Download,
    ExternalLink,
    FileSpreadsheet,
    FileText,
    RefreshCw,
    Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';

// ============================================================================
// Internal Components
// ============================================================================

/**
 * Sortable table header component
 */
const SortableHeader = ({
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: keyof MachineData;
  currentSort: {
    key: keyof MachineData;
    direction: 'asc' | 'desc';
  };
  onSort: (key: keyof MachineData) => void;
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

export const ReportsMachinesOverview = ({
  overviewMachines,
  machineStats,
  locations,
  searchTerm,
  selectedLocation,
  onlineStatusFilter,
  overviewLoading,
  statsLoading,
  pagination,
  sortConfig,
  onSearchChange,
  onLocationChange,
  onStatusChange,
  onSort,
  onPageChange,
  onRefresh,
  onExport,
  onEdit,
  onDelete,
}: ReportsMachinesOverviewProps) => {
  const router = useRouter();

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      {statsLoading ? (
        <MetricCardsSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Machines
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {machineStats?.totalCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active gaming machines
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => {
              onStatusChange('online');
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Online Machines
              </CardTitle>
              <StatusIcon isOnline={true} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {machineStats?.onlineCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently connected
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() => {
              onStatusChange('offline');
            }}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Offline Machines
              </CardTitle>
              <StatusIcon isOnline={false} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {machineStats?.offlineCount || 0}
              </div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${machineStats?.totalGross?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Gross revenue this period
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        {/* Search Input - Takes maximum space */}
        <div className="w-full min-w-0 flex-1 md:max-w-none">
          <Input
            placeholder="Search machines..."
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="w-full border-gray-300 text-gray-900 placeholder:text-gray-600 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        {/* Location Select - Flexible width */}
        <div className="w-full md:w-auto md:min-w-[200px] md:max-w-[280px]">
          <LocationSingleSelect
            locations={locations}
            selectedLocation={selectedLocation}
            onSelectionChange={onLocationChange}
            placeholder="Select Location"
          />
        </div>
        {/* Status Select - Fixed width */}
        <Select value={onlineStatusFilter} onValueChange={onStatusChange}>
          <SelectTrigger className="w-full border-gray-300 text-gray-900 focus:border-blue-500 focus:ring-blue-500 md:w-40">
            <SelectValue placeholder="All Status" className="text-gray-900" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="online">Online</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Machines Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Machines Overview</CardTitle>
              <CardDescription>
                Detailed view of all machines with performance metrics
              </CardDescription>
            </div>
            {/* Action Buttons - Moved to header */}
            <div className="flex flex-wrap gap-2 sm:flex-nowrap">
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={overviewLoading}
                className="whitespace-nowrap"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="whitespace-nowrap"
                  >
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
          {overviewLoading || statsLoading ? (
            <MachinesOverviewSkeleton />
          ) : overviewMachines.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No machines found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                      sortKey="manufacturer"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Manufacturer
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
                    <SortableHeader
                      sortKey="gross"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Gross
                    </SortableHeader>
                    <th className="p-3 text-center font-medium text-gray-700">
                      Status
                    </th>
                    <th className="p-3 text-center font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {overviewMachines.map((machine: MachineData) => (
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
                        {machine.gameTitle || (
                          <span className="text-red-600">
                            (game name not provided)
                          </span>
                        )}
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
                        {machine.manufacturer || 'N/A'}
                      </td>
                      <td className="p-3 text-left">
                        <span
                          className={getFinancialColorClass(machine.coinIn)}
                        >
                          ${machine.coinIn.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left">
                        <span
                          className={getFinancialColorClass(machine.netWin)}
                        >
                          ${machine.netWin.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left">
                        <span className={getFinancialColorClass(machine.gross)}>
                          ${machine.gross.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <StatusIcon
                          isOnline={machine.isOnline || false}
                          className={machine.isOnline ? 'animate-pulse' : ''}
                        />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onEdit(machine)}
                          >
                            <Pencil2Icon className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDelete(machine)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-gray-500">
                Showing{' '}
                <span className="font-medium">
                  {(pagination.page - 1) * pagination.limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-medium">
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.totalCount
                  )}
                </span>{' '}
                of <span className="font-medium">{pagination.totalCount}</span>{' '}
                results
              </div>
              <PaginationControls
                currentPage={pagination.page - 1}
                totalPages={pagination.totalPages}
                setCurrentPage={(page: number) => onPageChange(page + 1)}
              />
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


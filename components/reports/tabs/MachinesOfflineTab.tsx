/**
 * Machines Offline Tab Component
 * Handles the offline machines tab with offline machine management
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DeleteCabinetModal } from '@/components/ui/cabinets/DeleteCabinetModal';
import { EditCabinetModal } from '@/components/ui/cabinets/EditCabinetModal';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import LocationSingleSelect from '@/components/ui/common/LocationSingleSelect';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MachinesOfflineSkeleton } from '@/components/ui/skeletons/ReportsSkeletons';
import { useCabinetActionsStore } from '@/lib/store/cabinetActionsStore';
import {
  ChevronDown,
  ChevronUp,
  Download,
  Monitor,
  RefreshCw,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
// Removed duplicate import - using MachineData from lib/types/machinesOfflineTab instead
import StatusIcon from '@/components/ui/common/StatusIcon';
import { getFinancialColorClass } from '@/lib/utils/financialColors';
import { Pencil2Icon } from '@radix-ui/react-icons';
import { Trash2 } from 'lucide-react';

// Sortable table header component for offline machines
const SortableOfflineHeader = ({
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: keyof MachineData;
  currentSort: { key: keyof MachineData; direction: 'asc' | 'desc' };
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

import type {
  MachineData,
  MachinesOfflineTabProps,
} from '@/lib/types/machinesOfflineTab';

export const MachinesOfflineTab = ({
  offlineMachines,
  locations,
  offlineLoading,
  offlinePagination,
  sortConfig,
  onSort,
  onPageChange,
  onRefresh,
  onExport,
}: MachinesOfflineTabProps) => {
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedOfflineDuration, setSelectedOfflineDuration] =
    useState<string>('all');

  // Handle edit action
  const handleEdit = useCallback(
    (machine: MachineData) => {
      // Convert MachineData to GamingMachine format for the modal
      const gamingMachine = {
        _id: machine.machineId,
        serialNumber: machine.serialNumber || machine.machineId,
        relayId: machine.machineId,
        game: machine.gameTitle,
        gameType: machine.machineType,
        isCronosMachine: false,
        cabinetType: machine.machineType,
        assetStatus: machine.isOnline ? 'active' : 'inactive',
        manufacturer: machine.manufacturer,
        gamingLocation: machine.locationName,
        accountingDenomination: 1,
        lastActivity: machine.lastActivity,
        online: machine.isOnline,
        moneyIn: machine.coinIn,
        moneyOut: machine.coinOut,
        jackpot: machine.jackpot,
        cancelledCredits: machine.totalCancelledCredits,
        gross: machine.gross,
        coinIn: machine.coinIn,
        coinOut: machine.coinOut,
        gamesPlayed: machine.gamesPlayed,
        gamesWon: machine.gamesWon || 0,
        handle: machine.coinIn,
        custom: {
          name: machine.serialNumber || machine.machineId || 'Unknown',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      openEditModal(gamingMachine);
    },
    [openEditModal]
  );

  // Handle delete action
  const handleDelete = useCallback(
    (machine: MachineData) => {
      // Convert MachineData to GamingMachine format for the modal
      const gamingMachine = {
        _id: machine.machineId,
        serialNumber: machine.serialNumber || machine.machineId,
        relayId: machine.machineId,
        game: machine.gameTitle,
        gameType: machine.machineType,
        isCronosMachine: false,
        cabinetType: machine.machineType,
        assetStatus: machine.isOnline ? 'active' : 'inactive',
        manufacturer: machine.manufacturer,
        gamingLocation: machine.locationName,
        accountingDenomination: 1,
        lastActivity: machine.lastActivity,
        online: machine.isOnline,
        moneyIn: machine.coinIn,
        moneyOut: machine.coinOut,
        jackpot: machine.jackpot,
        cancelledCredits: machine.totalCancelledCredits,
        gross: machine.gross,
        coinIn: machine.coinIn,
        coinOut: machine.coinOut,
        gamesPlayed: machine.gamesPlayed,
        gamesWon: machine.gamesWon || 0,
        handle: machine.coinIn,
        custom: {
          name: machine.serialNumber || machine.machineId || 'Unknown',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      openDeleteModal(gamingMachine);
    },
    [openDeleteModal]
  );

  // Filter offline machines based on search and location
  const filteredOfflineMachines = useMemo(() => {
    let filtered = offlineMachines;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        machine =>
          machine.machineId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine.gameTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine.locationName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by location
    if (selectedLocation !== 'all') {
      filtered = filtered.filter(
        machine => machine.locationId === selectedLocation
      );
    }

    // Filter by offline duration
    if (selectedOfflineDuration !== 'all') {
      const now = new Date();
      filtered = filtered.filter(machine => {
        if (!machine.lastActivity) return false;

        const lastOnlineDate = new Date(machine.lastActivity);
        const hoursOffline =
          (now.getTime() - lastOnlineDate.getTime()) / (1000 * 60 * 60);

        switch (selectedOfflineDuration) {
          case '1h':
            return hoursOffline >= 1;
          case '4h':
            return hoursOffline >= 4;
          case '24h':
            return hoursOffline >= 24;
          case '7d':
            return hoursOffline >= 168; // 7 days
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [offlineMachines, searchTerm, selectedLocation, selectedOfflineDuration]);

  // Calculate offline summary
  const offlineSummary = useMemo(() => {
    if (offlineMachines.length === 0) return null;

    const totalOffline = offlineMachines.length;
    const criticalOffline = offlineMachines.filter(machine => {
      if (!machine.lastActivity) return true;
      const now = new Date();
      const lastOnlineDate = new Date(machine.lastActivity);
      const hoursOffline =
        (now.getTime() - lastOnlineDate.getTime()) / (1000 * 60 * 60);
      return hoursOffline >= 24; // Critical if offline for 24+ hours
    }).length;

    const recentOffline = offlineMachines.filter(machine => {
      if (!machine.lastActivity) return false;
      const now = new Date();
      const lastOnlineDate = new Date(machine.lastActivity);
      const hoursOffline =
        (now.getTime() - lastOnlineDate.getTime()) / (1000 * 60 * 60);
      return hoursOffline < 4; // Recent if offline for less than 4 hours
    }).length;

    return {
      totalOffline,
      criticalOffline,
      recentOffline,
      criticalPercentage:
        totalOffline > 0 ? (criticalOffline / totalOffline) * 100 : 0,
      recentPercentage:
        totalOffline > 0 ? (recentOffline / totalOffline) * 100 : 0,
    };
  }, [offlineMachines]);

  return (
    <div className="space-y-4">
      {/* Offline Summary Cards */}
      {offlineSummary && (
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
      <Card>
        <CardHeader>
          <CardTitle>Offline Machine Filters</CardTitle>
          <CardDescription>
            Filter offline machines by location, duration, or search term
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search offline machines..."
                value={searchTerm}
                onChange={event => {
                  const newSearchTerm = event.target.value;
                  setSearchTerm(newSearchTerm);
                }}
              />
            </div>

            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <LocationSingleSelect
                locations={locations}
                selectedLocation={selectedLocation}
                onSelectionChange={(locationId: string) => {
                  setSelectedLocation(locationId);
                }}
                placeholder="All Locations"
              />
            </div>

            {/* Offline Duration Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Offline Duration</label>
              <Select
                value={selectedOfflineDuration}
                onValueChange={value => {
                  setSelectedOfflineDuration(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Durations" />
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
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={onRefresh} disabled={offlineLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button onClick={onExport} variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Offline Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Offline Machines</CardTitle>
          <CardDescription>
            Machines that are currently offline and require attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {offlineLoading ? (
            <MachinesOfflineSkeleton />
          ) : filteredOfflineMachines.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No offline machines found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <SortableOfflineHeader
                      sortKey="machineId"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Machine ID
                    </SortableOfflineHeader>
                    <SortableOfflineHeader
                      sortKey="gameTitle"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Game
                    </SortableOfflineHeader>
                    <SortableOfflineHeader
                      sortKey="locationName"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Location
                    </SortableOfflineHeader>
                    <SortableOfflineHeader
                      sortKey="lastActivity"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Last Online
                    </SortableOfflineHeader>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Offline Duration
                    </th>
                    <SortableOfflineHeader
                      sortKey="coinIn"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Handle
                    </SortableOfflineHeader>
                    <SortableOfflineHeader
                      sortKey="netWin"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Net Win
                    </SortableOfflineHeader>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Status
                    </th>
                    <th className="p-3 text-left font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOfflineMachines.map(machine => {
                    const now = new Date();
                    const lastOnlineDate = machine.lastActivity
                      ? new Date(machine.lastActivity)
                      : null;
                    const hoursOffline = lastOnlineDate
                      ? (now.getTime() - lastOnlineDate.getTime()) /
                        (1000 * 60 * 60)
                      : 0;

                    return (
                      <tr
                        key={machine.machineId}
                        className="border-b hover:bg-gray-50"
                      >
                        <td className="p-3 text-center">
                          {machine.machineId || 'N/A'}
                        </td>
                        <td className="p-3 text-center">
                          {machine.gameTitle ? (
                            machine.gameTitle
                          ) : (
                            <span className="text-red-600">
                              (game name not provided)
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {machine.locationName || 'N/A'}
                        </td>
                        <td className="p-3 text-center">
                          {lastOnlineDate
                            ? lastOnlineDate.toLocaleString()
                            : 'Never'}
                        </td>
                        <td className="p-3 text-center">
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
                        <td className="p-3 text-center">
                          <span
                            className={getFinancialColorClass(
                              machine.coinIn || 0
                            )}
                          >
                            ${(machine.coinIn || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={getFinancialColorClass(
                              machine.netWin || 0
                            )}
                          >
                            ${(machine.netWin || 0).toLocaleString()}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <StatusIcon isOnline={false} />
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEdit(machine)}
                            >
                              <Pencil2Icon className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDelete(machine)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {offlinePagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing{' '}
                {(offlinePagination.page - 1) * offlinePagination.limit + 1} to{' '}
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
      <EditCabinetModal onCabinetUpdated={onRefresh} />
      <DeleteCabinetModal onCabinetDeleted={onRefresh} />
    </div>
  );
};

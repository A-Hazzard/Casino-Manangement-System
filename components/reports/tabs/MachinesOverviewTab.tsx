/**
 * Machines Overview Tab Component
 * Handles the overview tab with machine statistics, charts, and table
 */

import { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, RefreshCw, ChevronUp, ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import LocationSingleSelect from "@/components/ui/common/LocationSingleSelect";
import { EditCabinetModal } from "@/components/ui/cabinets/EditCabinetModal";
import { DeleteCabinetModal } from "@/components/ui/cabinets/DeleteCabinetModal";
import { useCabinetActionsStore } from "@/lib/store/cabinetActionsStore";
import {
  ChartNoData,
  ChartSkeleton,
  MachinesOverviewSkeleton,
} from "@/components/ui/skeletons/ReportsSkeletons";
import { ManufacturerPerformanceChart } from "@/components/ui/ManufacturerPerformanceChart";
import { GamesPerformanceChart } from "@/components/ui/GamesPerformanceChart";
import { GamesPerformanceRevenueChart } from "@/components/ui/GamesPerformanceRevenueChart";
import type {
  MachineData,
  MachineStats,
} from "@/shared/types/machines";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Trash2 } from "lucide-react";
import StatusIcon from "@/components/ui/common/StatusIcon";
import { getFinancialColorClass } from "@/lib/utils/financialColors";

// Sortable table header component
const SortableHeader = ({ 
  children, 
  sortKey, 
  currentSort, 
  onSort 
}: { 
  children: React.ReactNode; 
  sortKey: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn'; 
  currentSort: { key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn'; direction: 'asc' | 'desc' }; 
  onSort: (key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn') => void; 
}) => {
  const isActive = currentSort.key === sortKey;
  
  return (
    <th 
      className="text-center p-3 font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors select-none"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          currentSort.direction === 'asc' ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )
        ) : (
          <div className="w-4 h-4 opacity-30">
            <ChevronUp className="w-4 h-4" />
          </div>
        )}
      </div>
    </th>
  );
};

interface MachinesOverviewTabProps {
  // Data props
  overviewMachines: MachineData[];
  allMachines: MachineData[];
  machineStats: MachineStats | null;
  manufacturerData: Array<{
    manufacturer: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
  }>;
  gamesData: Array<{
    gameName: string;
    floorPositions: number;
    totalHandle: number;
    totalWin: number;
    totalDrop: number;
    totalCancelledCredits: number;
    totalGross: number;
  }>;
  locations: { id: string; name: string; sasEnabled: boolean }[];
  
  // Loading states
  overviewLoading: boolean;
  manufacturerLoading: boolean;
  gamesLoading: boolean;
  statsLoading: boolean;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  
  // Sorting
  sortConfig: {
    key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn';
    direction: 'asc' | 'desc';
  };
  
  // Actions
  onSort: (key: keyof MachineData | 'handle' | 'avgWagerPerGame' | 'moneyIn') => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onExport: () => void;
  onEdit: (machine: MachineData) => void;
  onDelete: (machine: MachineData) => void;
}

export const MachinesOverviewTab = ({
  overviewMachines,
  machineStats,
  manufacturerData,
  gamesData,
  locations,
  overviewLoading,
  manufacturerLoading,
  gamesLoading,
  statsLoading,
  pagination,
  sortConfig,
  onSort,
  onPageChange,
  onRefresh,
  onExport,
}: MachinesOverviewTabProps) => {
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedManufacturer, setSelectedManufacturer] = useState<string>("all");

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
        assetStatus: machine.isOnline ? "active" : "inactive",
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
        custom: { name: machine.serialNumber || machine.machineId || "Unknown" },
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
        assetStatus: machine.isOnline ? "active" : "inactive",
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
        custom: { name: machine.serialNumber || machine.machineId || "Unknown" },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      openDeleteModal(gamingMachine);
    },
    [openDeleteModal]
  );

  // Filter machines based on search and location
  const filteredMachines = useMemo(() => {
    let filtered = overviewMachines;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter((machine) =>
        machine.machineId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.gameTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        machine.locationName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by location
    if (selectedLocation !== "all") {
      filtered = filtered.filter((machine) => machine.locationId === selectedLocation);
    }

    // Filter by manufacturer
    if (selectedManufacturer !== "all") {
      filtered = filtered.filter((machine) => machine.manufacturer === selectedManufacturer);
    }

    return filtered;
  }, [overviewMachines, searchTerm, selectedLocation, selectedManufacturer]);

  // Get unique manufacturers for filter
  const uniqueManufacturers = useMemo(() => {
    const manufacturers = [...new Set(overviewMachines.map(machine => machine.manufacturer).filter(Boolean))];
    return manufacturers;
  }, [overviewMachines]);

  // Calculate summary statistics

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Machines</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : machineStats?.totalCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Active gaming machines
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Machines</CardTitle>
            <StatusIcon isOnline={true} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : machineStats?.onlineCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Currently connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Offline Machines</CardTitle>
            <StatusIcon isOnline={false} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : machineStats?.offlineCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Badge variant="outline" className="text-green-600">
              ${machineStats?.totalGross?.toLocaleString() || "0"}
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : machineStats?.totalGross?.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground">
              Gross revenue this period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter machines by location, manufacturer, or search term
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(event) => {
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

            {/* Manufacturer Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Manufacturer</label>
              <Select
                value={selectedManufacturer}
                onValueChange={(value) => {
                  setSelectedManufacturer(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Manufacturers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Manufacturers</SelectItem>
                  {uniqueManufacturers.map((manufacturer) => (
                    <SelectItem key={manufacturer} value={manufacturer}>
                      {manufacturer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={onRefresh} disabled={overviewLoading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={onExport} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Manufacturer Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Manufacturer Performance</CardTitle>
            <CardDescription>
              Revenue by manufacturer
            </CardDescription>
          </CardHeader>
          <CardContent>
            {manufacturerLoading ? (
              <ChartSkeleton />
            ) : manufacturerData.length === 0 ? (
              <ChartNoData title="No Data" icon={null} message="No manufacturer data available" />
            ) : (
              <ManufacturerPerformanceChart data={manufacturerData} />
            )}
          </CardContent>
        </Card>

        {/* Games Performance Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Games Performance</CardTitle>
            <CardDescription>
              Revenue by game type
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gamesLoading ? (
              <ChartSkeleton />
            ) : gamesData.length === 0 ? (
              <ChartNoData title="No Data" icon={null} message="No games data available" />
            ) : (
              <GamesPerformanceChart data={gamesData} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Games Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Games Revenue Analysis</CardTitle>
          <CardDescription>
            Detailed revenue breakdown by game
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gamesLoading ? (
            <ChartSkeleton />
          ) : gamesData.length === 0 ? (
            <ChartNoData title="No Data" icon={null} message="No games revenue data available" />
          ) : (
            <GamesPerformanceRevenueChart data={gamesData} />
          )}
        </CardContent>
      </Card>

      {/* Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle>Machines Overview</CardTitle>
          <CardDescription>
            Detailed view of all machines with performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overviewLoading ? (
            <MachinesOverviewSkeleton />
          ) : filteredMachines.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No machines found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <SortableHeader sortKey="machineId" currentSort={sortConfig} onSort={onSort}>
                      Machine ID
                    </SortableHeader>
                    <SortableHeader sortKey="gameTitle" currentSort={sortConfig} onSort={onSort}>
                      Game
                    </SortableHeader>
                    <SortableHeader sortKey="locationName" currentSort={sortConfig} onSort={onSort}>
                      Location
                    </SortableHeader>
                    <SortableHeader sortKey="manufacturer" currentSort={sortConfig} onSort={onSort}>
                      Manufacturer
                    </SortableHeader>
                    <SortableHeader sortKey="coinIn" currentSort={sortConfig} onSort={onSort}>
                      Handle
                    </SortableHeader>
                    <SortableHeader sortKey="netWin" currentSort={sortConfig} onSort={onSort}>
                      Net Win
                    </SortableHeader>
                    <SortableHeader sortKey="gross" currentSort={sortConfig} onSort={onSort}>
                      Gross
                    </SortableHeader>
                    <th className="text-center p-3 font-medium text-gray-700">Status</th>
                    <th className="text-center p-3 font-medium text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMachines.map((machine) => (
                    <tr key={machine.machineId} className="border-b hover:bg-gray-50">
                      <td className="p-3 text-center">{machine.machineId || "N/A"}</td>
                      <td className="p-3 text-center">{machine.gameTitle || "N/A"}</td>
                      <td className="p-3 text-center">{machine.locationName || "N/A"}</td>
                      <td className="p-3 text-center">{machine.manufacturer || "N/A"}</td>
                      <td className="p-3 text-center">
                        <span className={getFinancialColorClass(machine.coinIn || 0)}>
                          ${(machine.coinIn || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={getFinancialColorClass(machine.netWin || 0)}>
                          ${(machine.netWin || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={getFinancialColorClass(machine.gross || 0)}>
                          ${(machine.gross || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <StatusIcon isOnline={machine.isOnline || false} />
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex gap-2 justify-center">
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
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
                {pagination.totalCount} results
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page - 1)}
                  disabled={!pagination.hasPrevPage}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(pagination.page + 1)}
                  disabled={!pagination.hasNextPage}
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

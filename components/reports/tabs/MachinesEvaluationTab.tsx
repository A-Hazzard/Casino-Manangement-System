/**
 * Machines Evaluation Tab Component
 * Handles the evaluation tab with machine performance analysis
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
import {
  BarChart3,
  Download,
  RefreshCw,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
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
import { MachinesEvaluationSkeleton } from "@/components/ui/skeletons/ReportsSkeletons";
import { MachineEvaluationSummary } from "@/components/ui/MachineEvaluationSummary";
// Removed duplicate import - using MachineData from lib/types/machinesEvaluationTab instead
import { Pencil2Icon } from "@radix-ui/react-icons";
import { Trash2 } from "lucide-react";
import StatusIcon from "@/components/ui/common/StatusIcon";
import { getFinancialColorClass } from "@/lib/utils/financialColors";

// Sortable table header component for evaluation data
const SortableEvaluationHeader = ({
  children,
  sortKey,
  currentSort,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: keyof MachineData;
  currentSort: { key: keyof MachineData; direction: "asc" | "desc" };
  onSort: (key: keyof MachineData) => void;
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
          currentSort.direction === "asc" ? (
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

import type {
  MachinesEvaluationTabProps,
  MachineData,
} from "@/lib/types/machinesEvaluationTab";

export const MachinesEvaluationTab = ({
  evaluationData,
  locations,
  evaluationLoading,
  sortConfig,
  onSort,
  onRefresh,
  onExport,
}: MachinesEvaluationTabProps) => {
  const { openEditModal, openDeleteModal } = useCabinetActionsStore();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<string>("all");
  const [selectedPerformance, setSelectedPerformance] = useState<string>("all");

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
        gamesWon: machine.gamesWon,
        handle: machine.coinIn,
        custom: {
          name: machine.serialNumber || machine.machineId || "Unknown",
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
        gamesWon: machine.gamesWon,
        handle: machine.coinIn,
        custom: {
          name: machine.serialNumber || machine.machineId || "Unknown",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      openDeleteModal(gamingMachine);
    },
    [openDeleteModal]
  );

  // Filter evaluation data based on search and location
  const filteredEvaluationData = useMemo(() => {
    let filtered = evaluationData;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(
        (machine) =>
          machine.machineId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine.gameTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          machine.locationName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by location
    if (selectedLocation !== "all") {
      filtered = filtered.filter(
        (machine) => machine.locationId === selectedLocation
      );
    }

    // Filter by performance level
    if (selectedPerformance !== "all") {
      if (selectedPerformance === "top") {
        filtered = filtered.filter(
          (machine) => (machine.actualHold || 0) > 0.8
        );
      } else if (selectedPerformance === "average") {
        filtered = filtered.filter(
          (machine) =>
            (machine.actualHold || 0) > 0.5 && (machine.actualHold || 0) <= 0.8
        );
      } else if (selectedPerformance === "poor") {
        filtered = filtered.filter(
          (machine) => (machine.actualHold || 0) <= 0.5
        );
      }
    }

    return filtered;
  }, [evaluationData, searchTerm, selectedLocation, selectedPerformance]);

  // Sort evaluation data
  const sortedEvaluationData = useMemo(() => {
    const sorted = [...filteredEvaluationData].sort((a, b) => {
      const aValue = a[sortConfig.key] as string | number;
      const bValue = b[sortConfig.key] as string | number;
      if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredEvaluationData, sortConfig]);

  // Calculate evaluation summary
  const evaluationSummary = useMemo(() => {
    if (evaluationData.length === 0) return null;

    const totalMachines = evaluationData.length;
    const topPerformers = evaluationData.filter(
      (machine) => (machine.actualHold || 0) > 0.8
    ).length;
    const averagePerformers = evaluationData.filter(
      (machine) =>
        (machine.actualHold || 0) > 0.5 && (machine.actualHold || 0) <= 0.8
    ).length;
    const poorPerformers = evaluationData.filter(
      (machine) => (machine.actualHold || 0) <= 0.5
    ).length;

    const totalRevenue = evaluationData.reduce(
      (sum, machine) => sum + (machine.gross || 0),
      0
    );
    const totalHandle = evaluationData.reduce(
      (sum, machine) => sum + (machine.coinIn || 0),
      0
    );

    return {
      totalMachines,
      topPerformers,
      averagePerformers,
      poorPerformers,
      totalRevenue,
      totalHandle,
      topPerformersPercentage:
        totalMachines > 0 ? (topPerformers / totalMachines) * 100 : 0,
      averagePerformersPercentage:
        totalMachines > 0 ? (averagePerformers / totalMachines) * 100 : 0,
      poorPerformersPercentage:
        totalMachines > 0 ? (poorPerformers / totalMachines) * 100 : 0,
    };
  }, [evaluationData]);

  return (
    <div className="space-y-6 mt-2">
      {/* Evaluation Summary Cards */}
      {evaluationSummary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Machines
              </CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {evaluationSummary.totalMachines}
              </div>
              <p className="text-xs text-muted-foreground">
                Machines evaluated
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Top Performers
              </CardTitle>
              <Badge variant="outline" className="text-green-600">
                {evaluationSummary.topPerformersPercentage.toFixed(1)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {evaluationSummary.topPerformers}
              </div>
              <p className="text-xs text-muted-foreground">
                High performance machines
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Performers
              </CardTitle>
              <Badge variant="outline" className="text-yellow-600">
                {evaluationSummary.averagePerformersPercentage.toFixed(1)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {evaluationSummary.averagePerformers}
              </div>
              <p className="text-xs text-muted-foreground">
                Moderate performance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Poor Performers
              </CardTitle>
              <Badge variant="outline" className="text-red-600">
                {evaluationSummary.poorPerformersPercentage.toFixed(1)}%
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {evaluationSummary.poorPerformers}
              </div>
              <p className="text-xs text-muted-foreground">Need attention</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Evaluation Filters</CardTitle>
          <CardDescription>
            Filter machines by location, performance level, or search term
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
                onSelectionChange={(locationId) => {
                  setSelectedLocation(locationId);
                }}
                placeholder="All Locations"
              />
            </div>

            {/* Performance Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Performance Level</label>
              <Select
                value={selectedPerformance}
                onValueChange={(value) => {
                  setSelectedPerformance(value);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Performance Levels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Performance Levels</SelectItem>
                  <SelectItem value="top">Top Performers</SelectItem>
                  <SelectItem value="average">Average Performers</SelectItem>
                  <SelectItem value="poor">Poor Performers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button onClick={onRefresh} disabled={evaluationLoading}>
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

      {/* Machine Evaluation Summary Component */}
      {evaluationSummary && (
        <MachineEvaluationSummary
          percOfTopMachines={evaluationSummary.topPerformersPercentage}
          percOfTopMachCoinIn={evaluationSummary.topPerformersPercentage}
        />
      )}

      {/* Evaluation Table */}
      <Card>
        <CardHeader>
          <CardTitle>Machine Performance Evaluation</CardTitle>
          <CardDescription>
            Detailed performance analysis of all machines
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluationLoading ? (
            <MachinesEvaluationSkeleton />
          ) : sortedEvaluationData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No machines found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <SortableEvaluationHeader
                      sortKey="machineId"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Machine ID
                    </SortableEvaluationHeader>
                    <SortableEvaluationHeader
                      sortKey="gameTitle"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Game
                    </SortableEvaluationHeader>
                    <SortableEvaluationHeader
                      sortKey="locationName"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Location
                    </SortableEvaluationHeader>
                    <SortableEvaluationHeader
                      sortKey="actualHold"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Performance
                    </SortableEvaluationHeader>
                    <SortableEvaluationHeader
                      sortKey="coinIn"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Handle
                    </SortableEvaluationHeader>
                    <SortableEvaluationHeader
                      sortKey="netWin"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Net Win
                    </SortableEvaluationHeader>
                    <SortableEvaluationHeader
                      sortKey="gross"
                      currentSort={sortConfig}
                      onSort={onSort}
                    >
                      Gross
                    </SortableEvaluationHeader>
                    <th className="text-center p-3 font-medium text-gray-700">
                      Status
                    </th>
                    <th className="text-center p-3 font-medium text-gray-700">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvaluationData.map((machine) => (
                    <tr
                      key={machine.machineId}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 text-center">
                        {machine.machineId || "N/A"}
                      </td>
                      <td className="p-3 text-center">
                        {machine.gameTitle || "N/A"}
                      </td>
                      <td className="p-3 text-center">
                        {machine.locationName || "N/A"}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant="outline"
                          className={
                            (machine.actualHold || 0) > 0.8
                              ? "text-green-600 border-green-600"
                              : (machine.actualHold || 0) > 0.5
                              ? "text-yellow-600 border-yellow-600"
                              : "text-red-600 border-red-600"
                          }
                        >
                          {(machine.actualHold || 0) > 0.8
                            ? "Top"
                            : (machine.actualHold || 0) > 0.5
                            ? "Average"
                            : "Poor"}
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
                        <span
                          className={getFinancialColorClass(machine.gross || 0)}
                        >
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
        </CardContent>
      </Card>

      {/* Modals */}
      <EditCabinetModal onCabinetUpdated={onRefresh} />
      <DeleteCabinetModal onCabinetDeleted={onRefresh} />
    </div>
  );
};

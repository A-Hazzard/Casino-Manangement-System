/**
 * Reports Machines Evaluation Tab Component
 *
 * Handles the evaluation tab with machine performance analysis
 *
 * Features:
 * - Multi-location selection
 * - Performance summary calculation
 * - Performance charts (Manufacturer, Games, Revenue)
 * - Top and Bottom performing machines tables
 *
 * @module components/reports/tabs/machines/ReportsMachinesEvaluation
 */

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import LocationMultiSelect from '@/components/ui/common/LocationMultiSelect';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ChartNoData,
  ChartSkeleton,
  MachinesEvaluationSkeleton,
  TopMachinesTableSkeleton,
} from '@/components/ui/skeletons/ReportsSkeletons';
import type {
  ReportsMachinesEvaluationProps,
  TopMachinesCriteria,
} from '@/lib/types/machinesEvaluationTab';
import { getFinancialColorClass } from '@/lib/utils/financialColors';
import { formatMachineDisplayNameWithBold } from '@/lib/utils/machineDisplay';
import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  RefreshCw,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import React from 'react';
import ReportsGamesPerformanceChart from './GamesPerformanceChart/ReportsGamesPerformanceChart';
import ReportsGamesPerformanceRevenueChart from './GamesPerformanceRevenueChart/ReportsGamesPerformanceRevenueChart';
import ReportsManufacturerPerformanceChart from './ManufacturerPerformanceChart/ReportsManufacturerPerformanceChart';
import ReportsMachinesEvaluationSummary from './ReportsMachinesEvaluationSummary/ReportsMachinesEvaluationSummary';

// ============================================================================
// Internal Components
// ============================================================================

/**
 * Sortable table header component for Top/Bottom Machines
 */
const SortableTopMachinesHeader = ({
  children,
  sortKey,
  currentSortKey,
  currentSortDirection,
  onSort,
}: {
  children: React.ReactNode;
  sortKey: TopMachinesCriteria;
  currentSortKey: TopMachinesCriteria;
  currentSortDirection: 'asc' | 'desc';
  onSort: (key: TopMachinesCriteria) => void;
}) => {
  const isActive = currentSortKey === sortKey;

  return (
    <th
      className="cursor-pointer select-none p-3 text-left font-medium text-gray-700 transition-colors hover:bg-gray-100"
      onClick={() => onSort(sortKey)}
    >
      <div className="flex items-center justify-start gap-1">
        {children}
        {isActive ? (
          currentSortDirection === 'asc' ? (
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

export const ReportsMachinesEvaluation = ({
  evaluationData,
  allMachines,
  manufacturerData,
  gamesData,
  locations,
  selectedLocationIds,
  evaluationLoading,
  topMachinesSortKey,
  topMachinesSortDirection,
  bottomMachinesSortKey,
  bottomMachinesSortDirection,
  summaryCalculations,
  topMachines,
  bottomMachines,
  onLocationChange,
  onTopMachinesSort,
  onBottomMachinesSort,
  onRefresh,
  onExport,
}: ReportsMachinesEvaluationProps) => {
  const router = useRouter();

  // ============================================================================
  // Render
  // ============================================================================

  if (evaluationLoading) {
    return <MachinesEvaluationSkeleton />;
  }

  return (
    <div className="mt-2 space-y-6">
      {/* ============================================================================
         Filters & Actions
         ============================================================================ */}
      <div className="mb-6 flex flex-col items-center gap-4 md:flex-row">
        <div className="w-full md:w-[420px]">
          <LocationMultiSelect
            locations={locations}
            selectedLocations={selectedLocationIds}
            onSelectionChange={onLocationChange}
            placeholder="Select locations..."
          />
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-initial"
            onClick={onRefresh}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 sm:flex-initial"
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

      {/* ============================================================================
         Summary Section
         ============================================================================ */}
      <div className="mb-6">
        <ReportsMachinesEvaluationSummary
          handleStatement={summaryCalculations.handleStatement}
          winStatement={summaryCalculations.winStatement}
          gamesPlayedStatement={summaryCalculations.gamesPlayedStatement}
          handleDetails={summaryCalculations.handleDetails}
          winDetails={summaryCalculations.winDetails}
          gamesPlayedDetails={summaryCalculations.gamesPlayedDetails}
        />
      </div>

      {/* ============================================================================
         Performance Charts
         ============================================================================ */}

      {/* Manufacturers Performance Chart */}
      <div className="mb-6">
        {(() => {
          if (evaluationLoading || allMachines.length === 0) {
            return <ChartSkeleton />;
          }
          if (manufacturerData && manufacturerData.length > 0) {
            return (
              <ReportsManufacturerPerformanceChart
                data={manufacturerData}
                allMachines={evaluationData}
              />
            );
          }
          return (
            <ChartNoData
              title="Manufacturers' Performance"
              icon={<BarChart3 className="h-5 w-5" />}
              message="No manufacturer performance data available for the selected location"
            />
          );
        })()}
      </div>

      {/* Games Performance Chart */}
      <div className="mb-6">
        {(() => {
          if (evaluationLoading || allMachines.length === 0) {
            return <ChartSkeleton />;
          }
          if (gamesData && gamesData.length > 0) {
            return (
              <ReportsGamesPerformanceChart
                data={gamesData}
                allMachines={evaluationData}
              />
            );
          }
          return (
            <ChartNoData
              title="Games' Performance"
              icon={<BarChart3 className="h-5 w-5" />}
              message="No games performance data available for the selected location"
            />
          );
        })()}
      </div>

      {/* Games Performance Revenue Chart */}
      <div className="mb-6">
        {(() => {
          if (evaluationLoading || allMachines.length === 0) {
            return <ChartSkeleton />;
          }
          if (gamesData && gamesData.length > 0) {
            return (
              <ReportsGamesPerformanceRevenueChart
                data={gamesData}
                allMachines={evaluationData}
              />
            );
          }
          return (
            <ChartNoData
              title="Games' Performance Revenue"
              icon={<BarChart3 className="h-5 w-5" />}
              message="No games revenue data available for the selected location"
            />
          );
        })()}
      </div>

      {/* ============================================================================
         Top & Bottom Machines Tables
         ============================================================================ */}

      {/* Top 5 Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-600" />
            Top Machines
          </CardTitle>
          <CardDescription>
            Top 5 highest performing machines based on selected criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluationLoading ? (
            <TopMachinesTableSkeleton />
          ) : topMachines.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No machines found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <SortableTopMachinesHeader
                      sortKey="locationName"
                      currentSortKey={topMachinesSortKey}
                      currentSortDirection={topMachinesSortDirection}
                      onSort={onTopMachinesSort}
                    >
                      Location
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="machineId"
                      currentSortKey={topMachinesSortKey}
                      currentSortDirection={topMachinesSortDirection}
                      onSort={onTopMachinesSort}
                    >
                      Machine
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="coinIn"
                      currentSortKey={topMachinesSortKey}
                      currentSortDirection={topMachinesSortDirection}
                      onSort={onTopMachinesSort}
                    >
                      Handle
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="netWin"
                      currentSortKey={topMachinesSortKey}
                      currentSortDirection={topMachinesSortDirection}
                      onSort={onTopMachinesSort}
                    >
                      Net Win
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="gross"
                      currentSortKey={topMachinesSortKey}
                      currentSortDirection={topMachinesSortDirection}
                      onSort={onTopMachinesSort}
                    >
                      Gross
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="actualHold"
                      currentSortKey={topMachinesSortKey}
                      currentSortDirection={topMachinesSortDirection}
                      onSort={onTopMachinesSort}
                    >
                      Hold %
                    </SortableTopMachinesHeader>
                  </tr>
                </thead>
                <tbody>
                  {topMachines.map(machine => (
                    <tr
                      key={machine.machineId}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 text-left">
                        <button
                          onClick={() =>
                            router.push(`/locations/${machine.locationId}`)
                          }
                          className="group flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <span className="underline decoration-blue-600/30 decoration-1 underline-offset-4 group-hover:decoration-blue-800">
                            {machine.locationName}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                      <td className="p-3 text-left">
                        <button
                          onClick={() =>
                            router.push(`/cabinets/${machine.machineId}`)
                          }
                          className="group flex items-center gap-1.5 font-mono text-sm text-gray-900"
                        >
                          <span className="underline decoration-gray-400 decoration-1 underline-offset-4 hover:decoration-gray-900">
                            {formatMachineDisplayNameWithBold({
                              serialNumber: machine.machineId,
                              custom: { name: machine.machineName },
                              game: machine.gameTitle,
                            })}
                          </span>
                          <ExternalLink className="h-3 w-3 text-blue-600" />
                        </button>
                      </td>
                      <td className="p-3 text-left text-sm">
                        <span
                          className={getFinancialColorClass(machine.coinIn)}
                        >
                          ${machine.coinIn.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left text-sm">
                        <span
                          className={getFinancialColorClass(machine.netWin)}
                        >
                          ${machine.netWin.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left text-sm">
                        <span className={getFinancialColorClass(machine.gross)}>
                          ${machine.gross.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left text-sm font-medium">
                        {((machine.actualHold ?? 0) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Least Performing Machines Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-600" />
            Least Performing Machines
          </CardTitle>
          <CardDescription>
            Bottom 5 lowest performing machines based on selected criteria
          </CardDescription>
        </CardHeader>
        <CardContent>
          {evaluationLoading ? (
            <TopMachinesTableSkeleton />
          ) : bottomMachines.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No machines found matching your criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <SortableTopMachinesHeader
                      sortKey="locationName"
                      currentSortKey={bottomMachinesSortKey}
                      currentSortDirection={bottomMachinesSortDirection}
                      onSort={onBottomMachinesSort}
                    >
                      Location
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="machineId"
                      currentSortKey={bottomMachinesSortKey}
                      currentSortDirection={bottomMachinesSortDirection}
                      onSort={onBottomMachinesSort}
                    >
                      Machine
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="coinIn"
                      currentSortKey={bottomMachinesSortKey}
                      currentSortDirection={bottomMachinesSortDirection}
                      onSort={onBottomMachinesSort}
                    >
                      Handle
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="netWin"
                      currentSortKey={bottomMachinesSortKey}
                      currentSortDirection={bottomMachinesSortDirection}
                      onSort={onBottomMachinesSort}
                    >
                      Net Win
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="gross"
                      currentSortKey={bottomMachinesSortKey}
                      currentSortDirection={bottomMachinesSortDirection}
                      onSort={onBottomMachinesSort}
                    >
                      Gross
                    </SortableTopMachinesHeader>
                    <SortableTopMachinesHeader
                      sortKey="actualHold"
                      currentSortKey={bottomMachinesSortKey}
                      currentSortDirection={bottomMachinesSortDirection}
                      onSort={onBottomMachinesSort}
                    >
                      Hold %
                    </SortableTopMachinesHeader>
                  </tr>
                </thead>
                <tbody>
                  {bottomMachines.map(machine => (
                    <tr
                      key={machine.machineId}
                      className="border-b hover:bg-gray-50"
                    >
                      <td className="p-3 text-left">
                        <button
                          onClick={() =>
                            router.push(`/locations/${machine.locationId}`)
                          }
                          className="group flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          <span className="underline decoration-blue-600/30 decoration-1 underline-offset-4 group-hover:decoration-blue-800">
                            {machine.locationName}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </td>
                      <td className="p-3 text-left">
                        <button
                          onClick={() =>
                            router.push(`/cabinets/${machine.machineId}`)
                          }
                          className="group flex items-center gap-1.5 font-mono text-sm text-gray-900"
                        >
                          <span className="underline decoration-gray-400 decoration-1 underline-offset-4 hover:decoration-gray-900">
                            {formatMachineDisplayNameWithBold({
                              serialNumber: machine.machineId,
                              custom: { name: machine.machineName },
                              game: machine.gameTitle,
                            })}
                          </span>
                          <ExternalLink className="h-3 w-3 text-blue-600" />
                        </button>
                      </td>
                      <td className="p-3 text-left text-sm">
                        <span
                          className={getFinancialColorClass(machine.coinIn)}
                        >
                          ${machine.coinIn.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left text-sm">
                        <span
                          className={getFinancialColorClass(machine.netWin)}
                        >
                          ${machine.netWin.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left text-sm">
                        <span className={getFinancialColorClass(machine.gross)}>
                          ${machine.gross.toLocaleString()}
                        </span>
                      </td>
                      <td className="p-3 text-left text-sm font-medium">
                        {((machine.actualHold ?? 0) * 100).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

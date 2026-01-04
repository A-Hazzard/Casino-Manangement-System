/**
 * Chart Item Breakdown Modal Component
 *
 * Displays detailed location-based breakdown for a selected chart item
 * (manufacturer or game) when clicking on a bar in performance charts.
 *
 * Features:
 * - Location breakdown with all metrics
 * - Responsive design for many locations
 * - Scrollable table for large datasets
 * - Summary totals
 * - Percentage calculations per location
 *
 * @module components/ui/modals/ChartItemBreakdownModal
 */

'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCurrencyFormat } from '@/lib/hooks/useCurrencyFormat';
import type { MachineEvaluationData } from '@/lib/types';
import { formatCurrency } from '@/lib/utils/formatting';
import { useMemo } from 'react';

type LocationBreakdown = {
  locationId: string;
  locationName: string;
  machineCount: number;
  floorPositions: number; // Percentage
  totalHandle: number; // Absolute value
  totalHandlePercent: number; // Percentage
  totalWin: number; // Absolute value
  totalWinPercent: number; // Percentage
  totalDrop: number; // Absolute value
  totalDropPercent: number; // Percentage
  totalCancelledCredits: number; // Absolute value
  totalCancelledCreditsPercent: number; // Percentage
  totalGross: number; // Absolute value
  totalGrossPercent: number; // Percentage
  totalGamesPlayed: number; // Absolute value
  totalGamesPlayedPercent: number; // Percentage
};

type ChartItemBreakdownModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  itemType: 'manufacturer' | 'game';
  allMachines: MachineEvaluationData[];
  totalMetrics: {
    coinIn: number;
    netWin: number;
    drop: number;
    gross: number;
    cancelledCredits: number;
    gamesPlayed: number;
  };
  totalMachinesCount: number;
};

/**
 * Chart Item Breakdown Modal Component
 */
export default function ChartItemBreakdownModal({
  open,
  onOpenChange,
  itemName,
  itemType,
  allMachines,
  totalMetrics,
  totalMachinesCount,
}: ChartItemBreakdownModalProps) {
  const { formatAmount, shouldShowCurrency } =
    useCurrencyFormat();

  // Calculate location breakdown
  const locationBreakdown = useMemo(() => {
    // Filter machines by item (manufacturer or game)
    const filteredMachines = allMachines.filter(machine => {
      if (itemType === 'manufacturer') {
        return (machine.manufacturer || '').trim() === itemName.trim();
      } else {
        return (machine.gameTitle || '').trim() === itemName.trim();
      }
    });

    if (filteredMachines.length === 0) {
      return [];
    }

    // Group by location
    const locationMap = new Map<string, MachineEvaluationData[]>();
    filteredMachines.forEach(machine => {
      const locationId = machine.locationId || 'unknown';
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, []);
      }
      locationMap.get(locationId)!.push(machine);
    });

    // Calculate metrics per location
    const breakdown: LocationBreakdown[] = [];
    locationMap.forEach((machines, locationId) => {
      const locationName = machines[0]?.locationName || 'Unknown Location';

      // Calculate totals for this location
      const locationTotals = machines.reduce(
        (acc, machine) => ({
          coinIn: acc.coinIn + (machine.coinIn || 0),
          netWin: acc.netWin + (machine.netWin || 0),
          drop: acc.drop + (machine.drop || 0),
          gross: acc.gross + (machine.gross || 0),
          cancelledCredits:
            acc.cancelledCredits + (machine.cancelledCredits || 0),
          gamesPlayed: acc.gamesPlayed + (machine.gamesPlayed || 0),
        }),
        {
          coinIn: 0,
          netWin: 0,
          drop: 0,
          gross: 0,
          cancelledCredits: 0,
          gamesPlayed: 0,
        }
      );

      // Calculate percentages
      const floorPositions =
        totalMachinesCount > 0
          ? (machines.length / totalMachinesCount) * 100
          : 0;
      const totalHandlePercent =
        totalMetrics.coinIn > 0
          ? (locationTotals.coinIn / totalMetrics.coinIn) * 100
          : 0;
      const totalWinPercent =
        totalMetrics.netWin > 0
          ? (locationTotals.netWin / totalMetrics.netWin) * 100
          : 0;
      const totalDropPercent =
        totalMetrics.drop > 0
          ? (locationTotals.drop / totalMetrics.drop) * 100
          : 0;
      const totalCancelledCreditsPercent =
        totalMetrics.cancelledCredits > 0
          ? (locationTotals.cancelledCredits / totalMetrics.cancelledCredits) *
            100
          : 0;
      const totalGrossPercent =
        totalMetrics.gross > 0
          ? (locationTotals.gross / totalMetrics.gross) * 100
          : 0;
      const totalGamesPlayedPercent =
        totalMetrics.gamesPlayed > 0
          ? (locationTotals.gamesPlayed / totalMetrics.gamesPlayed) * 100
          : 0;

      breakdown.push({
        locationId,
        locationName,
        machineCount: machines.length,
        floorPositions,
        totalHandle: locationTotals.coinIn,
        totalHandlePercent,
        totalWin: locationTotals.netWin,
        totalWinPercent,
        totalDrop: locationTotals.drop,
        totalDropPercent,
        totalCancelledCredits: locationTotals.cancelledCredits,
        totalCancelledCreditsPercent,
        totalGross: locationTotals.gross,
        totalGrossPercent,
        totalGamesPlayed: locationTotals.gamesPlayed,
        totalGamesPlayedPercent,
      });
    });

    // Sort by machine count descending
    return breakdown.sort((a, b) => b.machineCount - a.machineCount);
  }, [itemName, itemType, allMachines, totalMetrics, totalMachinesCount]);

  // Calculate totals
  const totals = useMemo(() => {
    return locationBreakdown.reduce(
      (acc, location) => ({
        machineCount: acc.machineCount + location.machineCount,
        totalHandle: acc.totalHandle + location.totalHandle,
        totalWin: acc.totalWin + location.totalWin,
        totalDrop: acc.totalDrop + location.totalDrop,
        totalCancelledCredits:
          acc.totalCancelledCredits + location.totalCancelledCredits,
        totalGross: acc.totalGross + location.totalGross,
        totalGamesPlayed: acc.totalGamesPlayed + location.totalGamesPlayed,
      }),
      {
        machineCount: 0,
        totalHandle: 0,
        totalWin: 0,
        totalDrop: 0,
        totalCancelledCredits: 0,
        totalGross: 0,
        totalGamesPlayed: 0,
      }
    );
  }, [locationBreakdown]);

  const itemLabel = itemType === 'manufacturer' ? 'Manufacturer' : 'Game';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {itemLabel} Breakdown: {itemName}
          </DialogTitle>
          <DialogDescription>
            Detailed location-based breakdown showing how this {itemType} is
            distributed across locations
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white z-10">
                <TableRow>
                  <TableHead className="font-semibold">Location</TableHead>
                  <TableHead className="text-right font-semibold">
                    Machines
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Floor Positions %
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Handle
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Handle %
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Win
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Win %
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Drop
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Drop %
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Canc. Cr.
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Canc. Cr. %
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Gross
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Total Gross %
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Games Played
                  </TableHead>
                  <TableHead className="text-right font-semibold">
                    Games Played %
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locationBreakdown.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={15}
                      className="text-center py-8 text-gray-500"
                    >
                      No location data available for this {itemType}
                    </TableCell>
                  </TableRow>
                ) : (
                  locationBreakdown.map(location => (
                  <TableRow key={location.locationId}>
                    <TableCell className="font-medium">
                      {location.locationName}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.machineCount}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.floorPositions.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                       {shouldShowCurrency()
                         ? formatAmount(location.totalHandle)
                         : formatCurrency(location.totalHandle)}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.totalHandlePercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                       {shouldShowCurrency()
                         ? formatAmount(location.totalWin)
                         : formatCurrency(location.totalWin)}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.totalWinPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                       {shouldShowCurrency()
                         ? formatAmount(location.totalDrop)
                         : formatCurrency(location.totalDrop)}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.totalDropPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                       {shouldShowCurrency()
                         ? formatAmount(location.totalCancelledCredits)
                         : formatCurrency(location.totalCancelledCredits)}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.totalCancelledCreditsPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                       {shouldShowCurrency()
                         ? formatAmount(location.totalGross)
                         : formatCurrency(location.totalGross)}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.totalGrossPercent.toFixed(2)}%
                    </TableCell>
                    <TableCell className="text-right">
                      {location.totalGamesPlayed.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {location.totalGamesPlayedPercent.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                  ))
                )}
                {/* Totals Row */}
                {locationBreakdown.length > 0 && (
                  <TableRow className="bg-gray-50 font-semibold">
                  <TableCell className="font-bold">Total</TableCell>
                  <TableCell className="text-right font-bold">
                    {totals.machineCount}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {locationBreakdown.reduce(
                      (sum, loc) => sum + loc.floorPositions,
                      0
                    ).toFixed(2)}
                    %
                  </TableCell>
                  <TableCell className="text-right font-bold">
                     {shouldShowCurrency()
                       ? formatAmount(totals.totalHandle)
                       : formatCurrency(totals.totalHandle)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {locationBreakdown.reduce(
                      (sum, loc) => sum + loc.totalHandlePercent,
                      0
                    ).toFixed(2)}
                    %
                  </TableCell>
                  <TableCell className="text-right font-bold">
                     {shouldShowCurrency()
                       ? formatAmount(totals.totalWin)
                       : formatCurrency(totals.totalWin)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {locationBreakdown.reduce(
                      (sum, loc) => sum + loc.totalWinPercent,
                      0
                    ).toFixed(2)}
                    %
                  </TableCell>
                  <TableCell className="text-right font-bold">
                     {shouldShowCurrency()
                       ? formatAmount(totals.totalDrop)
                       : formatCurrency(totals.totalDrop)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {locationBreakdown.reduce(
                      (sum, loc) => sum + loc.totalDropPercent,
                      0
                    ).toFixed(2)}
                    %
                  </TableCell>
                  <TableCell className="text-right font-bold">
                     {shouldShowCurrency()
                       ? formatAmount(totals.totalCancelledCredits)
                       : formatCurrency(totals.totalCancelledCredits)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {locationBreakdown.reduce(
                      (sum, loc) => sum + loc.totalCancelledCreditsPercent,
                      0
                    ).toFixed(2)}
                    %
                  </TableCell>
                  <TableCell className="text-right font-bold">
                     {shouldShowCurrency()
                       ? formatAmount(totals.totalGross)
                       : formatCurrency(totals.totalGross)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {locationBreakdown.reduce(
                      (sum, loc) => sum + loc.totalGrossPercent,
                      0
                    ).toFixed(2)}
                    %
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {totals.totalGamesPlayed.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {locationBreakdown.reduce(
                      (sum, loc) => sum + loc.totalGamesPlayedPercent,
                      0
                    ).toFixed(2)}
                    %
                  </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

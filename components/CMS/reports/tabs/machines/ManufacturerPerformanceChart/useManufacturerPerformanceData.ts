/**
 * Custom hook for Manufacturer Performance data processing
 * 
 * Handles data aggregation, filtering, and transformation for the manufacturer performance chart
 */

import { type MachineEvaluationData } from '@/lib/types';
import { useMemo } from 'react';

type ManufacturerPerformanceData = {
  manufacturer: string;
  floorPositions: number;
  totalHandle: number;
  totalWin: number;
  totalDrop: number;
  totalCancelledCredits: number;
  totalGross: number;
  totalGamesPlayed: number;
  rawTotals?: {
    coinIn: number;
    netWin: number;
    drop: number;
    gross: number;
    cancelledCredits: number;
    gamesPlayed: number;
  };
  totalMetrics?: {
    coinIn: number;
    netWin: number;
    drop: number;
    gross: number;
    cancelledCredits: number;
    gamesPlayed: number;
  };
  machineCount?: number;
  totalMachinesCount?: number;
};

type UseManufacturerPerformanceDataProps = {
  initialData: ManufacturerPerformanceData[];
  allMachines: MachineEvaluationData[];
  selectedFilters: string[];
  selectedManufacturers: string[];
};

/**
 * Custom hook for Manufacturer Performance data processing
 */
export function useManufacturerPerformanceData({
  initialData,
  allMachines,
  selectedFilters,
  selectedManufacturers,
}: UseManufacturerPerformanceDataProps) {
  // Re-aggregate data based on selected filters
  const aggregatedData = useMemo(() => {
    if (!allMachines.length) return initialData;

    let filteredMachines = allMachines;

    // Apply Top 5 / Bottom 5 filters
    if (!selectedFilters.includes('all-manufacturers')) {
      if (
        selectedFilters.includes('top-5-manufacturers') ||
        selectedFilters.includes('bottom-5-manufacturers')
      ) {
        const groupByManufacturer = filteredMachines
          .filter(
            machine => machine.manufacturer && machine.manufacturer.trim() !== ''
          )
          .reduce(
            (acc, machine) => {
              const manufacturer = machine.manufacturer.trim();
              if (!acc[manufacturer]) {
                acc[manufacturer] = [];
              }
              acc[manufacturer].push(machine);
              return acc;
            },
            {} as Record<string, typeof allMachines>
          );

        const manufacturerData = Object.keys(groupByManufacturer).map(manufacturer => {
          const machines = groupByManufacturer[manufacturer];
          const totals = machines.reduce(
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

          return {
            manufacturer,
            totalDrop: totals.drop,
          };
        });

        manufacturerData.sort((a, b) => b.totalDrop - a.totalDrop);

        const selectedManufacturerNames = new Set<string>();

        if (selectedFilters.includes('top-5-manufacturers')) {
          manufacturerData.slice(0, 5).forEach(m => selectedManufacturerNames.add(m.manufacturer));
        }

        if (selectedFilters.includes('bottom-5-manufacturers')) {
          manufacturerData.slice(-5).forEach(m => selectedManufacturerNames.add(m.manufacturer));
        }

        filteredMachines = filteredMachines.filter(m =>
          selectedManufacturerNames.has(m.manufacturer.trim())
        );
      }
    }

    // Standard grouping by manufacturer logic
    const groupByManufacturer = filteredMachines
      .filter(machine => machine.manufacturer && machine.manufacturer.trim() !== '')
      .reduce(
        (acc, machine) => {
          const manufacturer = machine.manufacturer.trim();
          if (!acc[manufacturer]) {
            acc[manufacturer] = [];
          }
          acc[manufacturer].push(machine);
          return acc;
        },
        {} as Record<string, typeof allMachines>
      );

    const totalMetrics = filteredMachines.reduce(
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

    const activeMachinesNumber = filteredMachines.length;

    return Object.keys(groupByManufacturer).map(manufacturer => {
      const machines = groupByManufacturer[manufacturer];
      const floorPositions =
        activeMachinesNumber > 0
          ? (machines.length / activeMachinesNumber) * 100
          : 0;

      const totals = machines.reduce(
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

      return {
        manufacturer,
        floorPositions,
        totalHandle:
          totalMetrics.coinIn > 0
            ? (totals.coinIn / totalMetrics.coinIn) * 100
            : 0,
        totalWin:
          totalMetrics.netWin > 0
            ? (totals.netWin / totalMetrics.netWin) * 100
            : 0,
        totalDrop:
          totalMetrics.drop > 0 ? (totals.drop / totalMetrics.drop) * 100 : 0,
        totalCancelledCredits:
          totalMetrics.cancelledCredits > 0
            ? (totals.cancelledCredits / totalMetrics.cancelledCredits) * 100
            : 0,
        totalGross:
          totalMetrics.gross > 0
            ? (totals.gross / totalMetrics.gross) * 100
            : 0,
        totalGamesPlayed:
          totalMetrics.gamesPlayed > 0
            ? (totals.gamesPlayed / totalMetrics.gamesPlayed) * 100
            : 0,
        rawTotals: totals,
        totalMetrics,
        machineCount: machines.length,
        totalMachinesCount: activeMachinesNumber,
      };
    });
  }, [allMachines, selectedFilters, initialData]);

  // Filter by selected manufacturers
  const filteredData = useMemo(() => {
    return aggregatedData.filter(d => selectedManufacturers.includes(d.manufacturer));
  }, [aggregatedData, selectedManufacturers]);

  // Transform data for the chart
  const chartData = useMemo(() => {
    return filteredData.map(item => {
      const maxLength = 15;
      const displayName =
        item.manufacturer.length > maxLength
          ? `${item.manufacturer.substring(0, maxLength)}...`
          : item.manufacturer;

      return {
        manufacturerName: displayName,
        fullManufacturerName: item.manufacturer,
        'Floor Positions %': item.floorPositions,
        'Total Handle %': item.totalHandle,
        'Total Win %': item.totalWin,
        'Total Drop %': item.totalDrop,
        'Total Canc. Cr. %': item.totalCancelledCredits,
        'Total Gross %': item.totalGross,
        'Total Games Played %': item.totalGamesPlayed,
        rawTotals: item.rawTotals,
        totalMetrics: item.totalMetrics,
        machineCount: item.machineCount || 0,
        totalMachinesCount: item.totalMachinesCount,
      };
    });
  }, [filteredData]);

  // Calculate width based on data length
  const minWidth = Math.max(600, filteredData.length * 60);

  return {
    aggregatedData,
    filteredData,
    chartData,
    minWidth,
  };
}



/**
 * Custom hook for Games Performance data processing
 * 
 * Handles data aggregation, filtering, and transformation for the games performance chart
 */

import { type MachineEvaluationData } from '@/lib/types';
import { useMemo } from 'react';

type GamesPerformanceData = {
  gameName: string;
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

type UseGamesPerformanceDataProps = {
  initialData: GamesPerformanceData[];
  allMachines: MachineEvaluationData[];
  selectedFilters: string[];
  selectedGames: string[];
};

/**
 * Custom hook for Games Performance data processing
 */
export function useGamesPerformanceData({
  initialData,
  allMachines,
  selectedFilters,
  selectedGames,
}: UseGamesPerformanceDataProps) {
  // Re-aggregate data based on selected filters
  const aggregatedData = useMemo(() => {
    if (!allMachines.length) return initialData;

    let filteredMachines = allMachines;

    // Apply Top 5 / Bottom 5 filters
    if (!selectedFilters.includes('all-games')) {
      if (
        selectedFilters.includes('top-5-games') ||
        selectedFilters.includes('bottom-5-games')
      ) {
        const groupByGameName = filteredMachines
          .filter(
            machine => machine.gameTitle && machine.gameTitle.trim() !== ''
          )
          .reduce(
            (acc, machine) => {
              const gameName = machine.gameTitle.trim();
              if (!acc[gameName]) {
                acc[gameName] = [];
              }
              acc[gameName].push(machine);
              return acc;
            },
            {} as Record<string, typeof allMachines>
          );

        const gameData = Object.keys(groupByGameName).map(gameName => {
          const machines = groupByGameName[gameName];
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
            gameName,
            totalDrop: totals.drop,
          };
        });

        gameData.sort((a, b) => b.totalDrop - a.totalDrop);

        const selectedGameNames = new Set<string>();

        if (selectedFilters.includes('top-5-games')) {
          gameData.slice(0, 5).forEach(g => selectedGameNames.add(g.gameName));
        }

        if (selectedFilters.includes('bottom-5-games')) {
          gameData.slice(-5).forEach(g => selectedGameNames.add(g.gameName));
        }

        filteredMachines = filteredMachines.filter(m =>
          selectedGameNames.has(m.gameTitle.trim())
        );
      }
    }

    // Standard grouping by gameTitle logic
    const groupByGameName = filteredMachines
      .filter(machine => machine.gameTitle && machine.gameTitle.trim() !== '')
      .reduce(
        (acc, machine) => {
          const gameName = machine.gameTitle.trim();
          if (!acc[gameName]) {
            acc[gameName] = [];
          }
          acc[gameName].push(machine);
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

    return Object.keys(groupByGameName).map(gameName => {
      const machines = groupByGameName[gameName];
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
        gameName,
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

  // Filter by selected games
  const filteredData = useMemo(() => {
    return aggregatedData.filter(d => selectedGames.includes(d.gameName));
  }, [aggregatedData, selectedGames]);

  // Transform data for the chart
  const chartData = useMemo(() => {
    return filteredData.map(item => {
      const maxLength = 15;
      const displayName =
        item.gameName.length > maxLength
          ? `${item.gameName.substring(0, maxLength)}...`
          : item.gameName;

      return {
        gameName: displayName,
        fullGameName: item.gameName,
        'Floor Positions %': item.floorPositions,
        'Total Handle %': item.totalHandle,
        'Total Win %': item.totalWin,
        'Total Drop %': item.totalDrop,
        'Total Canc. Cr. %': item.totalCancelledCredits,
        'Total Gross %': item.totalGross,
        'Total Games Played %': item.totalGamesPlayed,
        rawTotals: item.rawTotals,
        totalMetrics: item.totalMetrics,
        machineCount: item.machineCount,
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



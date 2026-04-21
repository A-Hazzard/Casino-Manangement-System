/**
 * Machines Tab Helper Functions
 *
 * Provides helper functions for the machines tab, including summary calculations,
 * Pareto principle logic, and formatting functions. It handles performance ratings,
 * offline duration calculations, and data formatting for the machines reports.
 *
 * Features:
 * - Performance rating calculations based on hold difference
 * - Offline duration calculation from last activity
 * - Offline duration formatting (hours, days)
 * - Summary calculations for machine evaluation
 * - Pareto principle logic for top/bottom machines
 */

import type { MachineEvaluationData } from '@/lib/types';

/**
 * Performance rating based on hold difference
 */
export const getPerformanceRating = (holdDifference: number) => {
  if (holdDifference >= 1) return 'excellent';
  if (holdDifference >= 0) return 'good';
  if (holdDifference >= -1) return 'average';
  return 'poor';
};

/**
 * Calculate offline duration in hours from lastActivity
 */
export const calculateOfflineDurationHours = (
  lastActivity: string | Date | null | undefined
): number => {
  if (!lastActivity) return 0;
  const lastActivityDate = new Date(lastActivity);
  if (Number.isNaN(lastActivityDate.getTime())) return 0;
  const now = new Date();
  const diffMs = now.getTime() - lastActivityDate.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
};

/**
 * Verification details type for Pareto calculations
 */
export type VerificationDetails = {
  metricName: string;
  totalMachines: number;
  machinesWithData: number;
  topMachines: Array<{
    machineId: string;
    machineName: string;
    value: number;
    cumulative: number;
    percentageOfTotal: number;
  }>;
  allMachinesWithData: Array<{
    machineId: string;
    machineName: string;
    locationName: string;
    locationId: string;
    manufacturer: string;
    gameTitle: string;
    value: number;
    percentageOfTotal: number;
    coinIn?: number;
    netWin?: number;
    gamesPlayed?: number;
    drop?: number;
    gross?: number;
  }>;
  totalValue: number;
  cumulativeValue: number;
  machinePercentage: number;
  metricPercentage: number;
};

/**
 * Calculates Pareto principle statement and details
 */
export const calculateParetoStatement = (
  machines: MachineEvaluationData[],
  metricGetter: (m: MachineEvaluationData) => number,
  total: number,
  metricName: string
): { statement: string; details: VerificationDetails | undefined } => {
  if (total === 0 || machines.length === 0)
    return { statement: '', details: undefined };

  // Filter out machines with zero metrics - only count machines that actually have data
  const machinesWithData = machines.filter(m => {
    const value = metricGetter(m);
    return value > 0 && !isNaN(value) && isFinite(value);
  });

  if (machinesWithData.length === 0) {
    return { statement: '', details: undefined };
  }

  // Sort machines by metric descending
  const sorted = [...machinesWithData].sort(
    (a, b) => metricGetter(b) - metricGetter(a)
  );

  // Store ALL machines with data for the modal
  const allMachinesWithData: VerificationDetails['allMachinesWithData'] =
    sorted.map(machine => {
      const metricValue = metricGetter(machine);
      return {
        machineId: machine.machineId,
        machineName: machine.machineName || machine.machineId,
        locationName: machine.locationName,
        locationId: machine.locationId,
        manufacturer: machine.manufacturer,
        gameTitle: machine.gameTitle,
        value: metricValue,
        percentageOfTotal: total > 0 ? (metricValue / total) * 100 : 0,
        coinIn: machine.coinIn,
        netWin: machine.netWin,
        gamesPlayed: machine.gamesPlayed,
        drop: machine.drop,
        gross: machine.gross,
      };
    });

  // Find the point where we reach 75% of total
  let cumulative = 0;
  let machineCount = 0;
  const targetPercentage = 75;
  const topMachines: VerificationDetails['topMachines'] = [];

  for (const machine of sorted) {
    const metricValue = metricGetter(machine);
    if (metricValue <= 0 || !isFinite(metricValue)) continue;

    cumulative += metricValue;
    machineCount++;
    const percentage = total > 0 ? (cumulative / total) * 100 : 0;

    // Store machine details for verification
    topMachines.push({
      machineId: machine.machineId,
      machineName: machine.machineName || machine.machineId,
      value: metricValue,
      cumulative,
      percentageOfTotal: percentage,
    });

    // If we've reached or exceeded 75%, return the statement
    if (percentage >= targetPercentage) {
      const machinePercentage =
        machinesWithData.length > 0
          ? (machineCount / machinesWithData.length) * 100
          : 0;
      const statement = `${Math.max(1, Math.round(machinePercentage))}% of the machines contribute to ${Math.round(percentage)}% of the Total ${metricName}`;

      return {
        statement,
        details: {
          metricName,
          totalMachines: machines.length,
          machinesWithData: machinesWithData.length,
          topMachines,
          allMachinesWithData,
          totalValue: total,
          cumulativeValue: cumulative,
          machinePercentage: Math.round(machinePercentage),
          metricPercentage: Math.round(percentage),
        },
      };
    }
  }

  // If we never reached 75%, show what we have (but only if we have meaningful data)
  if (machineCount === 0 || cumulative === 0) {
    return { statement: '', details: undefined };
  }

  const machinePercentage =
    machinesWithData.length > 0
      ? (machineCount / machinesWithData.length) * 100
      : 0;
  const finalPercentage = total > 0 ? (cumulative / total) * 100 : 0;

  if (finalPercentage < 1) {
    return { statement: '', details: undefined };
  }

  const statement = `${Math.max(1, Math.round(machinePercentage))}% of the machines contribute to ${Math.round(finalPercentage)}% of the Total ${metricName}`;

  return {
    statement,
    details: {
      metricName,
      totalMachines: machines.length,
      machinesWithData: machinesWithData.length,
      topMachines,
      allMachinesWithData,
      totalValue: total,
      cumulativeValue: cumulative,
      machinePercentage: Math.round(machinePercentage),
      metricPercentage: Math.round(finalPercentage),
    },
  };
};



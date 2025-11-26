/**
 * Database Utility Functions
 *
 * Utility functions for database operations and metric calculations.
 *
 * Features:
 * - Meter data fetching
 * - Metrics calculation from meter data
 * - Database connection handling
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { dashboardData } from '@/lib/types';
import type { MeterData } from '@shared/types';
import { Meters as MeterModel } from '@/app/api/lib/models/meters';

// ============================================================================
// Database Query Functions
// ============================================================================
/**
 * Fetches all meter records from the database as plain JavaScript objects.
 *
 * @returns Promise resolving to a list of MeterData objects.
 */
export async function getAllMeters(): Promise<MeterData[]> {
  try {
    await connectDB();

    // Fetch all meters as plain JS objects
    const rawMeters = await MeterModel.find({}).limit(10).lean<MeterData>();

    // Check if MongoDB returned an array as expected
    // If not, log error and return empty array as fallback
    if (!Array.isArray(rawMeters)) {
      console.error('Unexpected response from MongoDB, expected an array');
      return [];
    }

    return rawMeters;
  } catch (error) {
    console.error('Error fetching meters:', error);
    return [];
  }
}

// ============================================================================
// Metrics Calculation Functions
// ============================================================================
/**
 * Calculates the summary metrics from a list of meters.
 *
 * @param meters - List of meters to process.
 * @returns Totals for drop, cancelled credits, and gross profit.
 */
export function calculateMetrics(meters: MeterData[]): Partial<dashboardData> {
  let totalDrop = 0; // Total money inserted (Wager)
  let totalCancelledCredits = 0; // Total money removed (Games Won)
  let totalGross = 0; // Gross Profit (Drop - Cancelled Credits)

  meters.forEach((meter: MeterData) => {
    const drop = meter.movement?.drop ?? 0;
    const totalCancelled = meter.movement?.totalCancelledCredits ?? 0;
    const gross = drop - totalCancelled;

    totalDrop += drop;
    totalCancelledCredits += totalCancelled;
    totalGross += gross;
  });

  return {
    moneyIn: totalDrop,
    moneyOut: totalCancelledCredits,
    gross: totalGross,
  } as Partial<dashboardData>;
}

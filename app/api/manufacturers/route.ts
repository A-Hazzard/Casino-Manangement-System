/**
 * Manufacturers API Route
 *
 * This route handles fetching unique manufacturers from the machines collection.
 * It supports:
 * - Aggregating manufacturers from both 'manufacturer' and 'manuf' fields
 * - Filtering out empty values
 * - Alphabetical sorting
 *
 * @module app/api/manufacturers/route
 */

import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching manufacturers
 *
 * Flow:
 * 1. Connect to database
 * 2. Aggregate unique manufacturers from machines collection
 * 3. Filter out empty values
 * 4. Sort alphabetically
 * 5. Return manufacturers list
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Aggregate unique manufacturers from machines collection
    // ============================================================================
    // Check both 'manufacturer' and 'manuf' fields
    const manufacturers = await Machine.aggregate([
      {
        $project: {
          manufacturer: 1,
          manuf: 1,
        },
      },
      {
        $group: {
          _id: null,
          manufacturers: { $addToSet: '$manufacturer' },
          manufs: { $addToSet: '$manuf' },
        },
      },
      {
        $project: {
          _id: 0,
          allManufacturers: {
            $setUnion: ['$manufacturers', '$manufs'],
          },
        },
      },
    ]);

    // ============================================================================
    // STEP 3: Filter out empty values
    // ============================================================================
    const uniqueManufacturers = manufacturers[0]?.allManufacturers || [];
    const filteredManufacturers = uniqueManufacturers.filter(
      (manufacturer: string) => manufacturer && manufacturer.trim() !== ''
    );

    // ============================================================================
    // STEP 4: Sort alphabetically
    // ============================================================================
    const sortedManufacturers = filteredManufacturers.sort();

    // ============================================================================
    // STEP 5: Return manufacturers list
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Manufacturers API] Completed in ${duration}ms`);
    }

    return NextResponse.json(sortedManufacturers);
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch manufacturers';
    console.error(`[Manufacturers API] Error after ${duration}ms:`, errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

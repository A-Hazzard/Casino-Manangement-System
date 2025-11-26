/**
 * Check First Collection API Route
 *
 * This route checks if a collection would be the first collection for a machine.
 * It supports:
 * - Checking if any collections exist for a machine
 * - Determining if this would be the first collection
 *
 * @module app/api/collections/check-first-collection/route
 */

import { Collections } from '@/app/api/lib/models/collections';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for checking if this would be the first collection
 *
 * Flow:
 * 1. Connect to database
 * 2. Parse query parameters
 * 3. Validate machineId
 * 4. Check if any collections exist for this machine
 * 5. Determine if this would be the first collection
 * 6. Return result
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Parse query parameters
    // ============================================================================
    const searchParams = request.nextUrl.searchParams;
    const machineId = searchParams.get('machineId');

    // ============================================================================
    // STEP 3: Validate machineId
    // ============================================================================
    if (!machineId) {
      return NextResponse.json(
        { error: 'machineId is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Check if any collections exist for this machine
    // ============================================================================
    const existingCollection = await Collections.findOne({
      machineId: machineId,
    })
      .select('_id')
      .lean();

    // ============================================================================
    // STEP 5: Determine if this would be the first collection
    // ============================================================================
    const isFirstCollection = !existingCollection;

    // ============================================================================
    // STEP 6: Return result
    // ============================================================================
    return NextResponse.json({
      isFirstCollection,
      machineId,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to check collection status';
    console.error(
      `[Check First Collection API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}


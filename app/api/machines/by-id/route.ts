/**
 * Machine By ID API Route
 *
 * This route handles fetching a single machine by ID with specific fields.
 * It supports:
 * - Fetching machine by ID query parameter
 * - Filtering soft-deleted machines
 * - Returning specific fields (gamingLocation, smibConfig, etc.)
 *
 * @module app/api/machines/by-id/route
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main GET handler for fetching a machine by ID
 *
 * Flow:
 * 1. Parse machine ID from query parameters
 * 2. Validate machine ID parameter
 * 3. Connect to database
 * 4. Fetch machine with specific fields
 * 5. Return machine data
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse machine ID from query parameters
    // ============================================================================
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // ============================================================================
    // STEP 2: Validate machine ID parameter
    // ============================================================================
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Fetch machine with specific fields
    // ============================================================================
    const machine = await Machine.findOne({
      _id: id,
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    }).select(
      '_id serialNumber game gamingLocation assetStatus cabinetType createdAt updatedAt smibConfig relayId smibBoard'
    );

    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Return machine data
    // ============================================================================
    return NextResponse.json({
      success: true,
      data: machine,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to fetch machine';
    console.error(
      `[Machines By-ID API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * POST handler - Not allowed for this route
 */
export function POST() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

/**
 * PUT handler - Not allowed for this route
 */
export function PUT() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

/**
 * DELETE handler - Not allowed for this route
 */
export function DELETE() {
  return NextResponse.json({ error: 'Method Not Allowed' }, { status: 405 });
}

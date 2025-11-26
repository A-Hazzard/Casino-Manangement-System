/**
 * Machine Collection History API Route
 *
 * This route handles CRUD operations for machine collection history entries.
 * It supports:
 * - Adding new collection history entries
 * - Updating existing entries
 * - Deleting entries by ID or locationReportId
 * - Managing collectionMetersHistory array on machine documents
 *
 * @module app/api/machines/[machineId]/collection-history/route
 */

import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * Main PATCH handler for managing machine collection history
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Validate machine ID and operation
 * 3. Connect to database
 * 4. Find machine document
 * 5. Initialize collectionMetersHistory if needed
 * 6. Execute operation (add/update/delete)
 * 7. Save machine document
 * 8. Return success response
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ machineId: string }> }
) {
  const startTime = Date.now();

  try {
    // ============================================================================
    // STEP 1: Parse route parameters and request body
    // ============================================================================
    const { machineId } = await params;
    const body = await request.json();
    const { operation, entry, entryId } = body;

    // ============================================================================
    // STEP 2: Validate machine ID and operation
    // ============================================================================
    if (!machineId) {
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );
    }

    if (!operation || !['add', 'update', 'delete'].includes(operation)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid operation. Must be 'add', 'update', or 'delete'",
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 4: Find machine document
    // ============================================================================
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    const machine = await Machine.findOne({ _id: machineId });
    if (!machine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 5: Initialize collectionMetersHistory if needed
    // ============================================================================
    // Initialize collectionMetersHistory if it doesn't exist
    if (!machine.collectionMetersHistory) {
      machine.collectionMetersHistory = [];
    }

    // ============================================================================
    // STEP 6: Execute operation (add/update/delete)
    // ============================================================================
    let updated = false;

    switch (operation) {
      case 'add':
        if (!entry) {
          return NextResponse.json(
            {
              success: false,
              error: "Entry data is required for 'add' operation",
            },
            { status: 400 }
          );
        }

        // Create new collection history entry
        const newEntry = {
          _id: entry._id || uuidv4(),
          metersIn: entry.metersIn,
          metersOut: entry.metersOut,
          prevMetersIn: entry.prevMetersIn,
          prevMetersOut: entry.prevMetersOut,
          timestamp: new Date(entry.timestamp),
          locationReportId: entry.locationReportId,
        };

        machine.collectionMetersHistory.push(newEntry);
        updated = true;
        break;

      case 'update':
        if (!entry || !entryId) {
          return NextResponse.json(
            {
              success: false,
              error:
                "Entry data and entryId are required for 'update' operation",
            },
            { status: 400 }
          );
        }

        // Find and update the existing entry
        const entryIndex = machine.collectionMetersHistory.findIndex(
          (item: { _id: string | { toString(): string } }) =>
            String(item._id) === String(entryId)
        );

        if (entryIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Collection history entry not found' },
            { status: 404 }
          );
        }

        machine.collectionMetersHistory[entryIndex] = {
          _id: entryId,
          metersIn: entry.metersIn,
          metersOut: entry.metersOut,
          prevMetersIn: entry.prevMetersIn,
          prevMetersOut: entry.prevMetersOut,
          timestamp: new Date(entry.timestamp),
          locationReportId: entry.locationReportId,
        };
        updated = true;
        break;

      case 'delete':
        if (!entryId && !entry?.locationReportId) {
          return NextResponse.json(
            {
              success: false,
              error:
                "EntryId or locationReportId is required for 'delete' operation",
            },
            { status: 400 }
          );
        }

        // Remove the entry by entryId or locationReportId
        let deleteIndex = -1;
        if (entryId) {
          // Delete by entry ID
          deleteIndex = machine.collectionMetersHistory.findIndex(
            (item: { _id: string | { toString(): string } }) =>
              String(item._id) === String(entryId)
          );
        } else if (entry?.locationReportId) {
          // Delete by locationReportId
          deleteIndex = machine.collectionMetersHistory.findIndex(
            (item: { locationReportId: string }) =>
              String(item.locationReportId) === String(entry.locationReportId)
          );
        }

        if (deleteIndex === -1) {
          return NextResponse.json(
            { success: false, error: 'Collection history entry not found' },
            { status: 404 }
          );
        }

        machine.collectionMetersHistory.splice(deleteIndex, 1);
        updated = true;
        break;
    }

    // ============================================================================
    // STEP 7: Save machine document
    // ============================================================================
    if (updated) {
      // Save the updated machine
      await machine.save();
    }

    // ============================================================================
    // STEP 8: Return success response
    // ============================================================================
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`[Machine Collection History API] Completed in ${duration}ms`);
    }
    return NextResponse.json({
      success: true,
      message: `Collection history ${operation} operation completed successfully`,
      data: {
        operation,
        entryId: operation === 'add' ? entry?._id : entryId,
        collectionHistoryCount: machine.collectionMetersHistory.length,
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    console.error(
      `[Machine Collection History API] Error after ${duration}ms:`,
      errorMessage
    );
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


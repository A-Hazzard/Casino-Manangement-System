/**
 * Cabinet Collection History API Route
 *
 * This route handles CRUD operations for cabinet collection history entries.
 * It supports:
 * - Adding new collection history entries
 * - Updating existing entries
 * - Deleting entries by ID or locationReportId
 * - Managing collectionMetersHistory array on machine documents
 *
 * @module app/api/cabinets/[cabinetId]/collection-history/route
 */

import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

/**
 * PATCH /api/machines/[machineId]/collection-history
 *
 * Performs a single create, replace, or remove operation on the
 * collectionMetersHistory array of a machine document. The desired operation
 * and its associated entry data are supplied in the JSON body.
 *
 * URL params:
 * @param machineId  {string} Required (path). The machine whose collection history
 *                   is being modified.
 *
 * Body fields:
 * @param operation        {'add'|'update'|'delete'} Required. Which CRUD operation
 *                         to execute on the history array.
 * @param entry            {object} Required for 'add' and 'update'; optional for
 *                         'delete' (used to match by locationReportId instead of entryId).
 * @param entry._id        {string} Optional on 'add' (auto-generated if absent). Required
 *                         context for 'update' (also passed as entryId).
 * @param entry.metersIn   {number} Meter-in reading for this collection history entry.
 * @param entry.metersOut  {number} Meter-out reading for this collection history entry.
 * @param entry.prevMetersIn   {number} Previous meter-in value (for delta calculations).
 * @param entry.prevMetersOut  {number} Previous meter-out value (for delta calculations).
 * @param entry.timestamp      {string|Date} Collection timestamp for this entry.
 * @param entry.locationReportId {string} ID of the parent CollectionReport; used as
 *                               an alternate delete key when entryId is not provided.
 * @param entryId          {string} Required for 'update' and 'delete' (by ID). The _id
 *                         of the history entry to update or remove.
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
  request: NextRequest
) {
  const startTime = Date.now();
  const { pathname } = request.nextUrl;
  const machineId = pathname.split('/')[3];

  try {
    const { operation, entry, entryId } = await request.json();
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
      console.warn(`[Cabinet Collection History API] Completed in ${duration}ms`);
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
      `[Cabinet Collection History API] Error after ${duration}ms:`,
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


/**
 * Collection by ID API Route
 *
 * This route handles updating a specific collection by ID.
 * It supports:
 * - Updating collection fields (meters, timestamps, notes, etc.)
 * - Recalculating movement and SAS metrics when meters change
 * - Recalculating SAS time ranges when timestamp changes
 * - Updating machine collectionMetersHistory
 * - Cascading recalculation to related collections
 *
 * @module app/api/collection-reports/collections/[id]/route
 */

import {
  cascadeRecalculationForPatch,
  determineRecalculationFlags,
  extractSasTimeFieldsFromPayload,
  handleRamClearToggleWithRelayGuard,
  logCollectionPatchActivity,
  recalculateMovementAndSasForPatch,
  updateMachineHistoryForPatch,
} from '@/app/api/lib/helpers/collectionReport/collectionByIdOperations';
import { Collections } from '@/app/api/lib/models/collections';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type { CollectionDocument } from '@/lib/types/collection';
import { NextRequest, NextResponse } from 'next/server';

/**
 * PATCH /api/collection-reports/collections/[id]
 *
 * EDITS a single collection document (NOT creation flow).
 * Used when user edits a collection entry in the UI to correct values.
 *
 * Key behaviors:
 * - Updates collection document with edited values (metersIn, metersOut, prevIn, prevOut, notes, etc.)
 * - Recalculates movement and SAS metrics when meters change
 * - Recalculates SAS time ranges when timestamp changes
 * - Updates machine collectionMetersHistory entry
 * - Does NOT update machine.collectionMeters (only creation flow does this)
 * - Calls updateRegularAndRamClearMeters with fully updated document
 *
 * @see updateMachineCollectionData — for CREATION flow (updates machine meters)
 *
 * @param {string} id - Required (path). The _id of the collection to update.
 *
 * Body fields:
 * @param {number} [metersIn] - Optional. New meter-in reading. Triggers movement
 *                                            recalculation and cascade.
 * @param {number} [metersOut] - Optional. New meter-out reading. Triggers movement
 *                                            recalculation and cascade.
 * @param {string|Date} [sasEndTime] - Optional. Override for sasMeters.sasEndTime.
 * @param {string|Date} [sasStartTime] - Optional. Override for sasMeters.sasStartTime.
 * @param {string|Date} [timestamp] - Optional. Collection timestamp.
 * @param {string|Date} [collectionTime] - Optional. Alternative collection timestamp field.
 * @param {boolean} [ramClear] - Optional. Flags that a RAM-clear occurred.
 * @param {number} [ramClearMetersIn] - Optional. Post-RAM-clear meter-in value.
 * @param {number} [ramClearMetersOut] - Optional. Post-RAM-clear meter-out value.
 * @param {number} [ramClearCoinIn] - Optional. Post-RAM-clear coin-in value.
 * @param {number} [ramClearCoinOut] - Optional. Post-RAM-clear coin-out value.
 * @param {string} [notes] - Optional. Free-text notes on the collection entry.
 * @param {number} [prevIn] - Optional. Override for the previous meter-in value.
 * @param {number} [prevOut] - Optional. Override for the previous meter-out value.
 *
 * Note: collector and collectorName fields are intentionally stripped before the update
 * to prevent accidental reassignment of collection ownership.
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Validate collection ID
 * 3. Connect to database and fetch original collection
 * 4. Handle RAM clear toggle (relay-aware)
 * 5. Remove immutable _id, extract SAS time fields
 * 6. Build and apply first update (basic fields + explicit SAS times)
 * 7. Recalculate movement and SAS metrics if needed
 * 8. Update machine collectionMetersHistory
 * 9. Cascade recalculation to related collections
 * 10. Log activity and return updated collection
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/collection-reports/collections/[id]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const collectionId = pathname.split('/').pop();

  try {
    // ============================================================================
    // STEP 1: Parse request body
    // ============================================================================
    const updateData = await request.json();

    // ============================================================================
    // STEP 2: Validate collection ID
    // ============================================================================
    if (!collectionId) {
      logRouteError(
        functionName,
        'PATCH',
        '/api/collection-reports/collections/[id]',
        'Collection ID is required',
        user
      );
      return NextResponse.json(
        { success: false, error: 'Collection ID is required' },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 3: Connect to database and fetch original collection
    // ============================================================================
    await connectDB();

    const originalCollection = await Collections.findOne({
      _id: collectionId,
    }).lean<CollectionDocument | null>();

    if (!originalCollection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 4: Handle RAM clear toggle (relay-aware)
    // ============================================================================
    const explicitSasEndTime = updateData.sasEndTime;
    const { unsetData } = await handleRamClearToggleWithRelayGuard(
      originalCollection,
      updateData,
      explicitSasEndTime
    );

    // ============================================================================
    // STEP 5: Remove immutable _id, extract SAS time fields, determine flags
    // ============================================================================
    const { _id, ...safeUpdateData } = updateData as Record<string, unknown>;
    if ('_id' in updateData) {
      console.warn('⚠️ API: Removed _id field from update data');
    }

    const sasFields = extractSasTimeFieldsFromPayload(safeUpdateData);
    const flags = determineRecalculationFlags(updateData, sasFields);

    // ============================================================================
    // STEP 6: Build and apply first update (basic fields + explicit SAS times)
    // ============================================================================
    const updatePayload: Record<string, unknown> = {
      ...safeUpdateData,
      updatedAt: new Date(),
    };

    if (sasFields.hasPayloadSasEndTime) {
      updatePayload['sasMeters.sasEndTime'] = new Date(
        sasFields.payloadSasEndTime as Date
      );
    }
    if (sasFields.hasPayloadSasStartTime) {
      updatePayload['sasMeters.sasStartTime'] = new Date(
        sasFields.payloadSasStartTime as Date
      );
    }

    const updateQuery: Record<string, unknown> = {
      $set: updatePayload,
    };
    if (Object.keys(unsetData).length > 0) {
      updateQuery.$unset = unsetData;
    }

    const updatedCollection = await Collections.findOneAndUpdate(
      { _id: collectionId },
      updateQuery,
      { new: true, runValidators: false }
    );

    if (!updatedCollection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 7: Recalculate movement and SAS metrics if needed
    // ============================================================================
    if (flags.shouldRecalculate || flags.needsSasTimeRecalculation) {
      try {
        const finalUpdatedCollection = await recalculateMovementAndSasForPatch(
          collectionId,
          updatedCollection,
          updateData,
          sasFields,
          flags
        );

        // ========================================================================
        // STEP 8: Update machine collectionMetersHistory
        // ========================================================================
        await updateMachineHistoryForPatch(updatedCollection, updateData);

        // ========================================================================
        // STEP 9: Cascade recalculation to related collections
        // ========================================================================
        await cascadeRecalculationForPatch(
          updatedCollection,
          flags.shouldRecalculate
        );

        // ========================================================================
        // STEP 10: Log activity and return
        // ========================================================================
        await logCollectionPatchActivity(
          request,
          updatedCollection,
          originalCollection as unknown as Record<string, unknown> | null,
          updateData,
          finalUpdatedCollection,
          collectionId
        );

        const duration = Date.now() - startTime;
        logRouteUpdate(
          functionName,
          'PATCH',
          '/api/collection-reports/collections/[id]',
          1,
          user,
          duration
        );

        return NextResponse.json({
          success: true,
          data: finalUpdatedCollection,
        });
      } catch (recalculationError) {
        console.error(
          '[PATCH /api/collection-reports/collections/[id]] Recalculation error:',
          recalculationError instanceof Error
            ? recalculationError.message
            : 'Unknown error'
        );
        return NextResponse.json({
          success: true,
          data: updatedCollection,
          warning: 'Recalculation failed, but basic update succeeded',
        });
      }
    }

    // No recalculation needed - return the updated collection
    const duration = Date.now() - startTime;
    logRouteUpdate(
      functionName,
      'PATCH',
      '/api/collection-reports/collections/[id]',
      1,
      user,
      duration
    );

    return NextResponse.json({
      success: true,
      data: updatedCollection,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'PATCH',
      '/api/collection-reports/collections/[id]',
      errorMessage,
      user
    );
    console.error(
      '[PATCH /api/collection-reports/collections/[id]] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

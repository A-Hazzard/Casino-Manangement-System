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

import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { recalculateMachineCollections } from '@/app/api/lib/helpers/collectionReport/recalculation';
import { updateRegularAndRamClearMeters } from '@/app/api/lib/helpers/collectionReport/reportCreation';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import {
  logRouteUpdate,
  logRouteError,
  extractUserFromRequest,
} from '@/app/api/lib/utils/routeLogger';
import type {
  CollectionDocument,
  PreviousCollectionMeters,
} from '@/lib/types/collection';
import type { GamingMachine } from '@/shared/types';
import { getClientIP } from '@/lib/utils/ipAddress';
import { calculateMovement } from '@/lib/utils/movement';
import { NextRequest, NextResponse } from 'next/server';

function toDate(val: Date | string | undefined): Date {
  if (!val) return new Date();
  return typeof val === 'string' ? new Date(val) : val;
}

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
 *                                            Supplied at the top level but mapped internally to
 *                                            sasMeters.sasEndTime via dot-notation to avoid
 *                                            Mongoose strict-mode stripping.
 * @param {string|Date} [sasStartTime] - Optional. Override for sasMeters.sasStartTime.
 *                                            Same top-level → nested mapping as sasEndTime.
 * @param {string|Date} [timestamp] - Optional. Collection timestamp. When changed,
 *                                            the full SAS time range is recalculated from
 *                                            scratch (using sasStartTime/sasEndTime from this
 *                                            same request if also provided, otherwise reset).
 *                                            Triggers movement recalculation and cascade.
 * @param {string|Date} [collectionTime] - Optional. Alternative collection timestamp field.
 *                                            Treated identically to timestamp for recalculation
 *                                            purposes.
 * @param {boolean} [ramClear] - Optional. Flags that a RAM-clear occurred.
 *                                            Triggers movement recalculation and cascade.
 * @param {number} [ramClearMetersIn] - Optional. Post-RAM-clear meter-in value used when
 *                                            computing softMeters. Triggers cascade.
 * @param {number} [ramClearMetersOut] - Optional. Post-RAM-clear meter-out value used when
 *                                            computing softMeters. Triggers cascade.
 * @param {number} [ramClearCoinIn] - Optional. Post-RAM-clear coin-in value; triggers
 *                                            cascade recalculation.
 * @param {number} [ramClearCoinOut] - Optional. Post-RAM-clear coin-out value; triggers
 *                                            cascade recalculation.
 * @param {string} [notes] - Optional. Free-text notes on the collection entry.
 * @param {number} [prevIn] - Optional. Override for the previous meter-in value
 *                                            used in movement calculation. Defaults to the
 *                                            collection document's stored prevIn.
 * @param {number} [prevOut] - Optional. Override for the previous meter-out value
 *                                            used in movement calculation. Defaults to the
 *                                            collection document's stored prevOut.
 *
 * Note: collector and collectorName fields are intentionally stripped before the update
 * to prevent accidental reassignment of collection ownership.
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Validate collection ID
 * 3. Connect to database
 * 4. Remove immutable _id field if present
 * 5. Extract and handle SAS time fields (sasEndTime, sasStartTime)
 * 6. Update collection document with all changes (SINGLE update)
 * 7. Recalculate movement and SAS metrics if meters/timestamp changed
 * 8. Update machine collectionMetersHistory if needed
 * 9. Cascade recalculation to related collections if needed
 * 10. Return updated collection
 */
export async function PATCH(request: NextRequest) {
  const startTime = Date.now();
  const functionName = 'PATCH /api/collection-reports/collections/[id]';
  const user = extractUserFromRequest(request);
  const { pathname } = request.nextUrl;
  const collectionId = pathname.split('/').pop();

  try {
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
    // STEP 3: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 3.5: Fetch original collection BEFORE update for activity logging
    // ============================================================================
    const originalCollectionForLog = await Collections.findOne({
      _id: collectionId,
    }).lean<CollectionDocument | null>();

    // ============================================================================
    // STEP 4: Remove immutable _id field if present
    // ============================================================================
    const { _id, ...safeUpdateData } = updateData as Record<string, unknown>;
    if ('_id' in updateData) {
      console.warn('⚠️ API: Removed _id field from update data');
    }

    // ============================================================================
    // STEP 5: Extract SAS time fields and handle them properly
    // ============================================================================
    // CRITICAL: Extract sasEndTime/sasStartTime from top-level payload and map them to
    // sasMeters.sasEndTime / sasMeters.sasStartTime using MongoDB dot notation.
    // The Collections schema does NOT have top-level sasEndTime/sasStartTime fields —
    // they live inside the sasMeters sub-document. Mongoose strict mode silently strips
    // top-level unknown fields, so a plain spread would never reach the nested paths.
    const payloadSasEndTime = safeUpdateData.sasEndTime as
      | string
      | Date
      | undefined;
    const payloadSasStartTime = safeUpdateData.sasStartTime as
      | string
      | Date
      | undefined;

    // [DEBUG] Log extracted payload SAS times
    console.warn(
      '[PATCH /api/collection-reports/collections/[id]] Extracted payload SAS times:',
      {
        payloadSasEndTime: payloadSasEndTime
          ? payloadSasEndTime instanceof Date
            ? payloadSasEndTime.toISOString()
            : new Date(payloadSasEndTime).toISOString()
          : 'undefined',
        payloadSasStartTime: payloadSasStartTime
          ? payloadSasStartTime instanceof Date
            ? payloadSasStartTime.toISOString()
            : new Date(payloadSasStartTime).toISOString()
          : 'undefined',
        payloadTypeSasEndTime: typeof payloadSasEndTime,
        payloadTypeSasStartTime: typeof payloadSasStartTime,
      }
    );

    // Remove from top-level to prevent Mongoose strict-mode silently dropping them
    delete (safeUpdateData as Record<string, unknown>).sasEndTime;
    delete (safeUpdateData as Record<string, unknown>).sasStartTime;
    delete (safeUpdateData as Record<string, unknown>).collector;
    delete (safeUpdateData as Record<string, unknown>).collectorName;

    // Determine if recalculation is needed
    const shouldRecalculate =
      updateData.metersIn !== undefined ||
      updateData.metersOut !== undefined ||
      updateData.timestamp !== undefined ||
      updateData.collectionTime !== undefined ||
      updateData.ramClear !== undefined ||
      updateData.ramClearMetersIn !== undefined ||
      updateData.ramClearMetersOut !== undefined ||
      updateData.ramClearCoinIn !== undefined ||
      updateData.ramClearCoinOut !== undefined;

    // Determine if SAS time recalculation is needed
    const hasPayloadSasEndTime = payloadSasEndTime !== undefined;
    const hasPayloadSasStartTime = payloadSasStartTime !== undefined;
    const hasTimestampChange = updateData.timestamp !== undefined;
    const needsSasTimeRecalculation =
      hasTimestampChange && !hasPayloadSasStartTime && !hasPayloadSasEndTime;

    // [DEBUG] Log conditions
    console.warn(
      '[PATCH /api/collection-reports/collections/[id]] SAS time conditions:',
      {
        hasPayloadSasEndTime,
        hasPayloadSasStartTime,
        hasTimestampChange,
        needsSasTimeRecalculation,
        shouldRecalculate,
      }
    );

    // ============================================================================
    // STEP 6: Build update payload (SINGLE update operation)
    // ============================================================================
    const updatePayload: Record<string, unknown> = {
      ...safeUpdateData,
      updatedAt: new Date(),
    };

    // Add SAS times to payload using dot notation if provided
    if (hasPayloadSasEndTime) {
      const sasEndTimeDate = new Date(payloadSasEndTime as Date);
      updatePayload['sasMeters.sasEndTime'] = sasEndTimeDate;
      console.warn(
        '[PATCH /api/collection-reports/collections/[id]] Adding sasEndTime to updatePayload:',
        {
          sasEndTime: sasEndTimeDate.toISOString(),
          fromPayload: payloadSasEndTime,
        }
      );
    }
    if (hasPayloadSasStartTime) {
      const sasStartTimeDate = new Date(payloadSasStartTime as Date);
      updatePayload['sasMeters.sasStartTime'] = sasStartTimeDate;
      console.warn(
        '[PATCH /api/collection-reports/collections/[id]] Adding sasStartTime to updatePayload:',
        {
          sasStartTime: sasStartTimeDate.toISOString(),
        }
      );
    }

    // First update: Apply basic fields and any explicit SAS times
    const updatedCollection = await Collections.findOneAndUpdate(
      { _id: collectionId },
      { $set: updatePayload },
      { new: true, runValidators: false }
    );

    if (!updatedCollection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // [DEBUG] Log after first update
    console.warn(
      '[PATCH /api/collection-reports/collections/[id]] After first update:',
      {
        collectionId,
        sasMetersAfterFirstUpdate: updatedCollection.sasMeters,
        sasEndTime: updatedCollection.sasMeters?.sasEndTime
          ? new Date(updatedCollection.sasMeters.sasEndTime).toISOString()
          : 'undefined',
        sasStartTime: updatedCollection.sasMeters?.sasStartTime
          ? new Date(updatedCollection.sasMeters.sasStartTime).toISOString()
          : 'undefined',
      }
    );

    // ============================================================================
    // STEP 7: Recalculate movement and SAS metrics if needed
    // ============================================================================
    if (shouldRecalculate || needsSasTimeRecalculation) {
      try {
        // Use prevIn/prevOut from the update data if provided, otherwise use the existing collection's values
        const previousMeters: PreviousCollectionMeters = {
          metersIn:
            updateData.prevIn !== undefined
              ? updateData.prevIn
              : updatedCollection.prevIn || 0,
          metersOut:
            updateData.prevOut !== undefined
              ? updateData.prevOut
              : updatedCollection.prevOut || 0,
        };

        const movement = calculateMovement(
          updatedCollection.metersIn || 0,
          updatedCollection.metersOut || 0,
          previousMeters,
          updatedCollection.ramClear,
          undefined, // ramClearCoinIn
          undefined, // ramClearCoinOut
          updatedCollection.ramClearMetersIn,
          updatedCollection.ramClearMetersOut
        );

        const roundedMovement = {
          metersIn: Number(movement.metersIn.toFixed(2)),
          metersOut: Number(movement.metersOut.toFixed(2)),
          gross: Number(movement.gross.toFixed(2)),
        };

        const softMetersIn =
          updatedCollection.ramClear && updatedCollection.ramClearMetersIn
            ? updatedCollection.ramClearMetersIn
            : updatedCollection.metersIn || 0;

        const softMetersOut =
          updatedCollection.ramClear && updatedCollection.ramClearMetersOut
            ? updatedCollection.ramClearMetersOut
            : updatedCollection.metersOut || 0;

        // Build recalculation payload
        const recalculatedData: Record<string, unknown> = {
          movement: roundedMovement,
          softMetersIn,
          softMetersOut,
          updatedAt: new Date(),
        };

        // Handle SAS meters recalculation
        if (updatedCollection.sasMeters) {
          let sasMetersData = {
            ...updatedCollection.sasMeters,
            drop: Number(roundedMovement.metersIn.toFixed(2)),
            totalCancelledCredits: Number(roundedMovement.metersOut.toFixed(2)),
            gross: Number(roundedMovement.gross.toFixed(2)),
            machine:
              updatedCollection.sasMeters.machine ||
              updatedCollection.machineName ||
              '',
            jackpot: Number(
              (updatedCollection.sasMeters.jackpot || 0).toFixed(2)
            ),
            gamesPlayed: updatedCollection.sasMeters.gamesPlayed || 0,
          };

          // [DEBUG] Log entry to SAS time handling
          console.warn(
            '[PATCH /api/collection-reports/collections/[id]] Entering SAS time handling:',
            {
              hasPayloadSasStartTime,
              hasPayloadSasEndTime,
              needsSasTimeRecalculation,
              currentSasStartTime: updatedCollection.sasMeters?.sasStartTime
                ? new Date(
                    updatedCollection.sasMeters.sasStartTime
                  ).toISOString()
                : 'undefined',
              currentSasEndTime: updatedCollection.sasMeters?.sasEndTime
                ? new Date(updatedCollection.sasMeters.sasEndTime).toISOString()
                : 'undefined',
            }
          );

          // Handle SAS time range
          // Priority: 1. Explicit SAS times from payload, 2. Recalculate if timestamp changed, 3. Keep existing
          let finalSasStartTime =
            toDate(updatedCollection.sasMeters?.sasStartTime) || new Date();
          let finalSasEndTime =
            toDate(updatedCollection.sasMeters?.sasEndTime) || new Date();

          if (hasPayloadSasStartTime && hasPayloadSasEndTime) {
            // Case 1: User provided both SAS times - preserve them exactly
            finalSasStartTime = toDate(payloadSasStartTime as string | Date);
            finalSasEndTime = toDate(payloadSasEndTime as string | Date);
            console.warn(
              '[PATCH /api/collection-reports/collections/[id]] Case 1: Using explicitly provided SAS times:',
              {
                sasStartTime: finalSasStartTime.toISOString(),
                sasEndTime: finalSasEndTime.toISOString(),
              }
            );
          } else if (hasPayloadSasEndTime) {
            // Case 2: User provided only sasEndTime (simple mode) - calculate sasStartTime ONLY
            const userProvidedEndTime = toDate(
              payloadSasEndTime as string | Date
            );
            const { getSasTimePeriod } =
              await import('@/app/api/lib/helpers/collectionReport/creation');
            const { sasStartTime: calculatedStartTime } =
              await getSasTimePeriod(
                updatedCollection.machineId,
                undefined,
                userProvidedEndTime
              );
            finalSasStartTime = toDate(calculatedStartTime);
            finalSasEndTime = userProvidedEndTime;
            console.warn(
              '[PATCH /api/collection-reports/collections/[id]] Case 2: Using simple mode SAS times:',
              {
                sasStartTime: finalSasStartTime.toISOString(),
                sasEndTime: finalSasEndTime.toISOString(),
                userProvidedEndTime: userProvidedEndTime.toISOString(),
              }
            );
          } else if (needsSasTimeRecalculation) {
            // Case 3: Timestamp changed, recalculate both SAS times
            const newTimestamp = toDate(updateData.timestamp as string | Date);
            const { getSasTimePeriod, calculateSasMetrics } =
              await import('@/app/api/lib/helpers/collectionReport/creation');
            const {
              sasStartTime: calculatedStartTime,
              sasEndTime: calculatedEndTime,
            } = await getSasTimePeriod(
              updatedCollection.machineId,
              undefined,
              newTimestamp
            );
            finalSasStartTime = toDate(calculatedStartTime);
            finalSasEndTime = toDate(calculatedEndTime);

            // Recalculate SAS metrics with new time range
            const newSasMetrics = await calculateSasMetrics(
              updatedCollection.machineId,
              finalSasStartTime,
              finalSasEndTime
            );

            sasMetersData = {
              ...sasMetersData,
              ...newSasMetrics,
            };

            console.warn(
              '[PATCH /api/collection-reports/collections/[id]] Case 3: Recalculated SAS times from timestamp change:',
              {
                sasStartTime: finalSasStartTime.toISOString(),
                sasEndTime: finalSasEndTime.toISOString(),
                newTimestamp: newTimestamp.toISOString(),
              }
            );
          } else {
            // Case 4: No changes needed, keep existing
            console.warn(
              '[PATCH /api/collection-reports/collections/[id]] Case 4: Keeping existing SAS times:',
              {
                sasStartTime: finalSasStartTime.toISOString(),
                sasEndTime: finalSasEndTime.toISOString(),
              }
            );
          }

          // Update SAS metrics with final times
          sasMetersData.sasStartTime = finalSasStartTime;
          sasMetersData.sasEndTime = finalSasEndTime;

          // [DEBUG] Log final SAS times before saving
          console.warn(
            '[PATCH /api/collection-reports/collections/[id]] About to save SAS times:',
            {
              finalSasStartTime: finalSasStartTime.toISOString(),
              finalSasEndTime: finalSasEndTime.toISOString(),
            }
          );

          recalculatedData.sasMeters = sasMetersData;
        }

        // Second update: Apply recalculated fields
        const finalUpdatedCollection = await Collections.findOneAndUpdate(
          { _id: collectionId },
          { $set: recalculatedData },
          { new: true, runValidators: true }
        );

        // Update regular and RAM clear meters
        if (finalUpdatedCollection) {
          await updateRegularAndRamClearMeters(finalUpdatedCollection);
        }

        // Update machine collectionMetersHistory if meters were updated
        if (
          updatedCollection.machineId &&
          (updateData.metersIn !== undefined ||
            updateData.metersOut !== undefined)
        ) {
          try {
            const currentMachine = await Machine.findOne({
              _id: updatedCollection.machineId,
            }).lean<GamingMachine | null>();

            if (currentMachine) {
              const existingHistoryEntry = (
                currentMachine as GamingMachine & {
                  collectionMetersHistory?: Array<{
                    locationReportId: string;
                    prevMetersIn?: number;
                    prevMetersOut?: number;
                    metersIn?: number;
                    metersOut?: number;
                    timestamp?: Date;
                  }>;
                }
              ).collectionMetersHistory?.find(
                (entry: { locationReportId: string }) =>
                  entry.locationReportId === updatedCollection.locationReportId
              );

              if (existingHistoryEntry) {
                // Get the correct prevMetersIn and prevMetersOut from the previous collection
                const collectionTimeForComparison =
                  updatedCollection.collectionTime ||
                  updatedCollection.timestamp;
                const previousCollection = await Collections.findOne(
                  {
                    machineId: updatedCollection.machineId,
                    $or: [
                      { collectionTime: { $lt: collectionTimeForComparison } },
                      { timestamp: { $lt: collectionTimeForComparison } },
                    ],
                    deletedAt: { $exists: false },
                  },
                  {
                    sort: {
                      collectionTime: -1,
                      timestamp: -1,
                    },
                  }
                );

                const prevMetersIn = previousCollection?.metersIn || 0;
                const prevMetersOut = previousCollection?.metersOut || 0;

                const updateResult = await Machine.findOneAndUpdate(
                  { _id: updatedCollection.machineId },
                  {
                    $set: {
                      updatedAt: new Date(),
                      'collectionMetersHistory.$[elem].metersIn':
                        updatedCollection.metersIn || 0,
                      'collectionMetersHistory.$[elem].metersOut':
                        updatedCollection.metersOut || 0,
                      'collectionMetersHistory.$[elem].prevMetersIn':
                        prevMetersIn,
                      'collectionMetersHistory.$[elem].prevMetersOut':
                        prevMetersOut,
                      'collectionMetersHistory.$[elem].timestamp':
                        updatedCollection.collectionTime ||
                        updatedCollection.timestamp ||
                        new Date(),
                    },
                  },
                  {
                    arrayFilters: [
                      {
                        'elem.locationReportId':
                          updatedCollection.locationReportId || '',
                      },
                    ],
                    new: true,
                  }
                );

                if (updateResult) {
                  console.warn(
                    'Updated existing collectionMetersHistory entry:',
                    {
                      machineId: updatedCollection.machineId,
                      locationReportId: updatedCollection.locationReportId,
                    }
                  );
                }
              }
            }
          } catch (machineUpdateError) {
            console.error(
              'Failed to update machine collection meters:',
              machineUpdateError
            );
          }
        }

        // Cascade recalculation to related collections
        if (shouldRecalculate && updatedCollection.machineId) {
          try {
            await recalculateMachineCollections(
              String(updatedCollection.machineId)
            );
          } catch (recalcError) {
            console.error(
              'Failed to recalculate machine collections:',
              recalcError
            );
          }
        }

        // Log activity
        const currentUser = await getUserFromServer();
        if (currentUser && currentUser.emailAddress) {
          try {
            const preUpdateDoc = originalCollectionForLog as Record<
              string,
              unknown
            > | null;
            const updateChanges: Array<{
              field: string;
              oldValue: unknown;
              newValue: unknown;
            }> = [];

            if (updateData.metersIn !== undefined && preUpdateDoc) {
              updateChanges.push({
                field: 'metersIn',
                oldValue: preUpdateDoc.metersIn,
                newValue: updateData.metersIn,
              });
            }
            if (updateData.metersOut !== undefined && preUpdateDoc) {
              updateChanges.push({
                field: 'metersOut',
                oldValue: preUpdateDoc.metersOut,
                newValue: updateData.metersOut,
              });
            }
            if (updateData.notes !== undefined && preUpdateDoc) {
              updateChanges.push({
                field: 'notes',
                oldValue: preUpdateDoc.notes,
                newValue: updateData.notes,
              });
            }
            if (updateData.ramClear !== undefined && preUpdateDoc) {
              updateChanges.push({
                field: 'ramClear',
                oldValue: preUpdateDoc.ramClear,
                newValue: updateData.ramClear,
              });
            }
            if (updateData.timestamp !== undefined && preUpdateDoc) {
              updateChanges.push({
                field: 'timestamp',
                oldValue: preUpdateDoc.timestamp,
                newValue: updateData.timestamp,
              });
            }

            await logActivity({
              action: 'UPDATE',
              details: `Updated machine ${updatedCollection.serialNumber || updatedCollection.machineName || updatedCollection.machineId} in collection report${updatedCollection.locationReportId ? ` (report: ${updatedCollection.locationReportId})` : ''} — ${updateChanges.length} change${updateChanges.length !== 1 ? 's' : ''}`,
              ipAddress: getClientIP(request) || undefined,
              userAgent: request.headers.get('user-agent') || undefined,
              userId: currentUser._id as string,
              username: currentUser.emailAddress as string,
              metadata: {
                userId: currentUser._id as string,
                userEmail: currentUser.emailAddress as string,
                userRole: (currentUser.roles as string[])?.[0] || 'user',
                resource: 'collection',
                resourceId: collectionId,
                resourceName:
                  updatedCollection.serialNumber ||
                  String(updatedCollection.machineId),
                locationReportId: updatedCollection.locationReportId || '',
                location: updatedCollection.location || '',
                changes: updateChanges,
                previousData: preUpdateDoc,
                newData: finalUpdatedCollection,
              },
            });
          } catch (logError) {
            console.error('Failed to log activity:', logError);
          }
        }

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
          'Error recalculating collection fields:',
          recalculationError
        );
        // Return the first update result even if recalculation fails
        return NextResponse.json({
          success: true,
          data: updatedCollection,
          warning: 'Recalculation failed, but basic update succeeded',
        });
      }
    }

    // No recalculation needed - return the updated collection
    console.warn('Collection updated successfully:', {
      collectionId,
      updatedFields: Object.keys(updateData),
    });

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
    console.error('Error updating collection:', error);
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

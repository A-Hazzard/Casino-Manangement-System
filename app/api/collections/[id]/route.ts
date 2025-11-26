/**
 * Collection by ID API Route
 *
 * This route handles updating a specific collection by ID.
 * It supports:
 * - Updating collection fields (meters, timestamps, notes, etc.)
 * - Recalculating movement and SAS metrics when meters change
 * - Recalculating SAS time ranges when timestamp changes
 * - Updating machine collectionMetersHistory
 * - Marking parent CollectionReport as editing when meters change
 * - Cascading recalculation to related collections
 *
 * @module app/api/collections/[id]/route
 */

import { recalculateMachineCollections } from '@/app/api/lib/helpers/collectionRecalculation';
import { CollectionReport } from '@/app/api/lib/models/collectionReport';
import { Collections } from '@/app/api/lib/models/collections';
import { Machine } from '@/app/api/lib/models/machines';
import { connectDB } from '@/app/api/lib/middleware/db';
import type { PreviousCollectionMeters } from '@/lib/types/collections';
import { calculateMovement } from '@/lib/utils/movementCalculation';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Main PATCH handler for updating a collection by ID
 *
 * Flow:
 * 1. Parse route parameters and request body
 * 2. Validate collection ID
 * 3. Connect to database
 * 4. Remove immutable _id field if present
 * 5. Update collection document
 * 6. Recalculate movement and SAS metrics if meters/timestamp changed
 * 7. Update machine collectionMetersHistory if needed
 * 8. Mark parent CollectionReport as editing if meters changed
 * 9. Cascade recalculation to related collections if needed
 * 10. Return updated collection
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ============================================================================
    // STEP 1: Parse route parameters and request body
    // ============================================================================
    const { id: collectionId } = await params;
    const updateData = await request.json();
    // ============================================================================
    // STEP 2: Validate collection ID
    // ============================================================================
    if (!collectionId) {
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
    // STEP 4: Remove immutable _id field if present
    // ============================================================================
    // Safety check: Remove _id field if present (it's immutable)
    const { _id, ...safeUpdateData } = updateData as Record<string, unknown>;
    if ('_id' in updateData) {
      console.warn('⚠️ API: Removed _id field from update data');
    }

    // Determine if cascade recalculation is needed
    const shouldCascade =
      updateData.metersIn !== undefined ||
      updateData.metersOut !== undefined ||
      updateData.prevIn !== undefined ||
      updateData.prevOut !== undefined ||
      updateData.timestamp !== undefined ||
      updateData.collectionTime !== undefined ||
      updateData.ramClear !== undefined ||
      updateData.ramClearMetersIn !== undefined ||
      updateData.ramClearMetersOut !== undefined ||
      updateData.ramClearCoinIn !== undefined ||
      updateData.ramClearCoinOut !== undefined;

    // ============================================================================
    // STEP 5: Update collection document
    // ============================================================================
    // Find and update the collection
    // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
    const updatedCollection = await Collections.findOneAndUpdate(
      { _id: collectionId },
      {
        ...safeUpdateData,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!updatedCollection) {
      return NextResponse.json(
        { success: false, error: 'Collection not found' },
        { status: 404 }
      );
    }

    // ============================================================================
    // STEP 6: Recalculate movement and SAS metrics if meters/timestamp changed
    // ============================================================================

    // Recalculate softMeters, movement, and sasMeters if meters or timestamp were updated
    if (
      updateData.metersIn !== undefined ||
      updateData.metersOut !== undefined ||
      updateData.ramClear !== undefined ||
      updateData.ramClearMetersIn !== undefined ||
      updateData.ramClearMetersOut !== undefined ||
      updateData.timestamp !== undefined
    ) {
      // ============================================================================
      // STEP 6.1: Recalculate movement and softMeters
      // ============================================================================
      try {
        // Use prevIn/prevOut from the update data if provided, otherwise use the existing collection's values
        // This is critical for edit operations - we need to use the ORIGINAL previous meters, not the machine's current meters
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

        console.warn('🔍 Using previous meters for movement calculation:', {
          previousMeters,
          fromUpdateData: {
            prevIn: updateData.prevIn,
            prevOut: updateData.prevOut,
          },
          fromCollection: {
            prevIn: updatedCollection.prevIn,
            prevOut: updatedCollection.prevOut,
          },
        });

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

        // Round movement values to 2 decimal places
        const roundedMovement = {
          metersIn: Number(movement.metersIn.toFixed(2)),
          metersOut: Number(movement.metersOut.toFixed(2)),
          gross: Number(movement.gross.toFixed(2)),
        };

        // Calculate softMeters (current meter values, potentially with RAM clear adjustments)
        const softMetersIn =
          updatedCollection.ramClear && updatedCollection.ramClearMetersIn
            ? updatedCollection.ramClearMetersIn
            : updatedCollection.metersIn || 0;

        const softMetersOut =
          updatedCollection.ramClear && updatedCollection.ramClearMetersOut
            ? updatedCollection.ramClearMetersOut
            : updatedCollection.metersOut || 0;

        // Prepare recalculated data
        const recalculatedData: Record<string, unknown> = {
          movement: roundedMovement,
          softMetersIn,
          softMetersOut,
          updatedAt: new Date(),
        };

        // Recalculate sasMeters - handle both meter changes and timestamp changes
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

          // If timestamp changed, recalculate SAS time range and metrics
          if (updateData.timestamp !== undefined) {
            try {
              console.warn(
                '🔄 Timestamp changed, recalculating SAS time range for collection:',
                {
                  collectionId,
                  oldTimestamp: updatedCollection.timestamp,
                  newTimestamp: updateData.timestamp,
                  machineId: updatedCollection.machineId,
                }
              );

              const { getSasTimePeriod, calculateSasMetrics } = await import(
                '@/lib/helpers/collectionCreation'
              );

              // Get new SAS time range based on new collection timestamp
              const { sasStartTime, sasEndTime } = await getSasTimePeriod(
                updatedCollection.machineId,
                undefined, // customStartTime
                new Date(updateData.timestamp) // customEndTime (new collection time)
              );

              // Recalculate SAS metrics with new time range
              const newSasMetrics = await calculateSasMetrics(
                updatedCollection.machineId,
                sasStartTime,
                sasEndTime
              );

              console.warn(
                '🔄 SAS metrics recalculated for timestamp change:',
                {
                  collectionId,
                  newSasStartTime: sasStartTime.toISOString(),
                  newSasEndTime: sasEndTime.toISOString(),
                  newSasGross: newSasMetrics.gross,
                  newSasDrop: newSasMetrics.drop,
                  newSasCancelledCredits: newSasMetrics.totalCancelledCredits,
                }
              );

              // Update SAS metrics with recalculated values
              sasMetersData = {
                ...sasMetersData,
                ...newSasMetrics,
                sasStartTime: sasStartTime.toISOString(),
                sasEndTime: sasEndTime.toISOString(),
                machine: sasMetersData.machine, // Keep the machine identifier
              };
            } catch (sasError) {
              console.error(
                ' Error recalculating SAS metrics for timestamp change:',
                sasError
              );
              // Fallback to original SAS times if recalculation fails
              sasMetersData.sasStartTime =
                updatedCollection.sasMeters.sasStartTime ||
                new Date().toISOString();
              sasMetersData.sasEndTime =
                updatedCollection.sasMeters.sasEndTime ||
                new Date().toISOString();
            }
          } else {
            // No timestamp change, keep existing SAS times
            sasMetersData.sasStartTime =
              updatedCollection.sasMeters.sasStartTime ||
              new Date().toISOString();
            sasMetersData.sasEndTime =
              updatedCollection.sasMeters.sasEndTime ||
              new Date().toISOString();
          }

          recalculatedData.sasMeters = sasMetersData;
        }

        // Update the collection with all recalculated fields
        // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
        const finalUpdatedCollection = await Collections.findOneAndUpdate(
          { _id: collectionId },
          recalculatedData,
          { new: true, runValidators: true }
        );

        console.warn('🔄 Recalculated all fields for updated collection:', {
          collectionId,
          previousMeters,
          currentMeters: {
            metersIn: updatedCollection.metersIn,
            metersOut: updatedCollection.metersOut,
          },
          calculatedMovement: movement,
          softMeters: { in: softMetersIn, out: softMetersOut },
          sasMetersUpdated: !!recalculatedData.sasMeters,
          timestampChanged: updateData.timestamp !== undefined,
          sasTimeRangeRecalculated: updateData.timestamp !== undefined,
        });

        // ============================================================================
        // STEP 7: Update machine collectionMetersHistory if needed
        // ============================================================================
        // (This step is handled later in the code)

        // ============================================================================
        // STEP 8: Mark parent CollectionReport as editing if meters changed
        // ============================================================================
        // CRITICAL: Mark parent CollectionReport as isEditing: true when meters are updated
        // This must happen BEFORE returning, otherwise it will be skipped
        if (
          finalUpdatedCollection &&
          (updateData.metersIn !== undefined ||
            updateData.metersOut !== undefined)
        ) {
          const reportIdToUpdate =
            finalUpdatedCollection.locationReportId ||
            updateData.locationReportId;
          if (reportIdToUpdate && reportIdToUpdate.trim() !== '') {
            try {
              console.warn(
                '🔄 Attempting to mark report as editing:',
                reportIdToUpdate
              );

              const updateResult = await CollectionReport.findOneAndUpdate(
                { locationReportId: reportIdToUpdate },
                {
                  $set: {
                    isEditing: true,
                    updatedAt: new Date(),
                  },
                },
                { new: true }
              );

              if (updateResult) {
                console.warn(
                  `✅ Successfully marked report ${reportIdToUpdate} as editing (report _id: ${updateResult._id})`
                );
              } else {
                console.warn(
                  `⚠️ Report with locationReportId ${reportIdToUpdate} not found for editing update`
                );
              }
            } catch (reportUpdateError) {
              console.error(
                'Failed to mark report as editing:',
                reportUpdateError
              );
              // Don't fail the collection update if report update fails
            }
          } else {
            console.warn(
              "⚠️ Collection has no locationReportId - this is expected for new collections that haven't been finalized yet"
            );
          }
        }

        return NextResponse.json({
          success: true,
          data: finalUpdatedCollection,
        });
      } catch (recalculationError) {
        console.error(
          'Error recalculating collection fields:',
          recalculationError
        );
        // Continue with the response even if recalculation fails
      }
    }

    // ============================================================================
    // STEP 7: Update machine collectionMetersHistory if needed
    // ============================================================================
    // Update machine collectionMetersHistory if meters were updated
    if (
      updatedCollection.machineId &&
      (updateData.metersIn !== undefined || updateData.metersOut !== undefined)
    ) {
      try {
        // Get the current machine to access previous meters
        // CRITICAL: Use findOne with _id instead of findById (repo rule)
        const currentMachine = await Machine.findOne({
          _id: updatedCollection.machineId,
        }).lean();
        if (currentMachine) {
          const currentMachineData = currentMachine as Record<string, unknown>;
          const currentCollectionMeters =
            currentMachineData.collectionMeters as
              | { metersIn: number; metersOut: number }
              | undefined;

          // Check if there's already a history entry with the same locationReportId
          const existingHistoryEntry = (
            currentMachine as {
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
            // Check if this is the most recent collection for this machine
            // Use collectionTime for more accurate comparison, fallback to timestamp
            const mostRecentCollection = await Collections.findOne(
              {
                machineId: updatedCollection.machineId,
                deletedAt: { $exists: false },
              },
              {
                sort: {
                  collectionTime: -1,
                  timestamp: -1,
                },
              }
            );

            const isMostRecent =
              mostRecentCollection?._id.toString() === collectionId.toString();

            // Get the correct prevMetersIn and prevMetersOut from the existing history entry
            // If prevMeters are undefined, we need to calculate them from the previous collection
            let prevMetersIn = existingHistoryEntry.prevMetersIn;
            let prevMetersOut = existingHistoryEntry.prevMetersOut;

            if (prevMetersIn === undefined || prevMetersOut === undefined) {
              // Find the previous collection to get the correct previous meters
              // Use collectionTime if available, fallback to timestamp
              const collectionTimeForComparison =
                updatedCollection.collectionTime || updatedCollection.timestamp;
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

              if (previousCollection) {
                prevMetersIn = previousCollection.metersIn || 0;
                prevMetersOut = previousCollection.metersOut || 0;
                console.warn(
                  '🔍 Calculated prevMeters from previous collection:',
                  {
                    prevMetersIn,
                    prevMetersOut,
                    previousCollectionId: previousCollection._id,
                  }
                );
              } else {
                prevMetersIn = 0;
                prevMetersOut = 0;
                console.warn(
                  '⚠️ No previous collection found, using 0 for prevMeters'
                );
              }
            }

            // Update existing history entry
            const updateData: Record<string, unknown> = {
              updatedAt: new Date(),
              'collectionMetersHistory.$[elem].metersIn':
                updatedCollection.metersIn || 0,
              'collectionMetersHistory.$[elem].metersOut':
                updatedCollection.metersOut || 0,
              'collectionMetersHistory.$[elem].timestamp': new Date(),
              'collectionMetersHistory.$[elem].prevMetersIn': prevMetersIn,
              'collectionMetersHistory.$[elem].prevMetersOut': prevMetersOut,
            };

            // CRITICAL: NEVER update machine collectionMeters when editing collections
            // Machine collectionMeters should ONLY be updated when Create Report button is pressed
            // This ensures proper timing and prevents premature meter updates

            // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
            await Machine.findOneAndUpdate(
              { _id: updatedCollection.machineId },
              { $set: updateData },
              {
                arrayFilters: [
                  {
                    'elem.locationReportId': updatedCollection.locationReportId,
                  },
                ],
                new: true,
              }
            );

            console.warn('Updated existing collectionMetersHistory entry:', {
              machineId: updatedCollection.machineId,
              locationReportId: updatedCollection.locationReportId,
              newMetersIn: updatedCollection.metersIn,
              newMetersOut: updatedCollection.metersOut,
              prevMetersIn,
              prevMetersOut,
              isMostRecent,
            });
          } else {
            // Check if this is the most recent collection for this machine
            // Use collectionTime for more accurate comparison, fallback to timestamp
            const mostRecentCollection = await Collections.findOne(
              {
                machineId: updatedCollection.machineId,
                deletedAt: { $exists: false },
              },
              {
                sort: {
                  collectionTime: -1,
                  timestamp: -1,
                },
              }
            );

            const isMostRecent =
              mostRecentCollection?._id.toString() === collectionId.toString();

            // Get the correct prevMetersIn and prevMetersOut from the previous collection
            // For new entries, use the current machine's collection meters as prev
            const prevMetersIn = currentCollectionMeters?.metersIn || 0;
            const prevMetersOut = currentCollectionMeters?.metersOut || 0;

            // Update existing history entry instead of creating new ones to prevent duplicates
            // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
            const updateResult = await Machine.findOneAndUpdate(
              { _id: updatedCollection.machineId },
              {
                $set: {
                  updatedAt: new Date(),
                  'collectionMetersHistory.$[elem].metersIn':
                    updatedCollection.metersIn || 0,
                  'collectionMetersHistory.$[elem].metersOut':
                    updatedCollection.metersOut || 0,
                  'collectionMetersHistory.$[elem].prevMetersIn': prevMetersIn,
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
              console.warn('Updated existing collectionMetersHistory entry:', {
                machineId: updatedCollection.machineId,
                locationReportId: updatedCollection.locationReportId,
                newMetersIn: updatedCollection.metersIn,
                newMetersOut: updatedCollection.metersOut,
                prevMetersIn,
                prevMetersOut,
                isMostRecent,
              });
            } else {
              console.warn(
                'No existing history entry found to update for collection:',
                updatedCollection._id
              );
            }
          }
        }
      } catch (machineUpdateError) {
        console.error(
          'Failed to update machine collection meters:',
          machineUpdateError
        );
        // Don't fail the collection update if machine update fails
      }
    }

    console.warn('Collection updated successfully:', {
      collectionId,
      updatedFields: Object.keys(updateData),
      newMetersIn: updatedCollection.metersIn,
      newMetersOut: updatedCollection.metersOut,
    });

    // CRITICAL: Mark parent CollectionReport as isEditing: true when meters are updated
    // This indicates the report has unsaved changes that need to be finalized
    console.warn('🔍 Checking if should mark report as editing:', {
      collectionId: updatedCollection._id,
      locationReportId: updatedCollection.locationReportId,
      locationReportIdType: typeof updatedCollection.locationReportId,
      locationReportIdLength: updatedCollection.locationReportId?.length,
      metersInChanged: updateData.metersIn !== undefined,
      metersOutChanged: updateData.metersOut !== undefined,
      metersInValue: updateData.metersIn,
      metersOutValue: updateData.metersOut,
      updateDataLocationReportId: updateData.locationReportId,
    });

    // Check if meters were updated
    if (
      updateData.metersIn !== undefined ||
      updateData.metersOut !== undefined
    ) {
      // If collection has a locationReportId, mark that report as editing
      if (
        updatedCollection.locationReportId &&
        updatedCollection.locationReportId.trim() !== ''
      ) {
        try {
          console.warn(
            '🔄 Attempting to mark report as editing:',
            updatedCollection.locationReportId
          );

          // CRITICAL: Use findOneAndUpdate since we're querying by locationReportId field, not _id
          // The locationReportId in the collection points to the CollectionReport's locationReportId field
          const updateResult = await CollectionReport.findOneAndUpdate(
            { locationReportId: updatedCollection.locationReportId },
            {
              $set: {
                isEditing: true,
                updatedAt: new Date(),
              },
            },
            { new: true }
          );

          if (updateResult) {
            console.warn(
              `✅ Successfully marked report ${updatedCollection.locationReportId} as editing (report _id: ${updateResult._id})`
            );
          } else {
            console.warn(
              `⚠️ Report with locationReportId ${updatedCollection.locationReportId} not found for editing update`
            );
          }
        } catch (reportUpdateError) {
          console.error('Failed to mark report as editing:', reportUpdateError);
          // Don't fail the collection update if report update fails
        }
      } else {
        console.warn(
          "⚠️ Collection has no locationReportId - this is expected for new collections that haven't been finalized yet"
        );
        // For collections without locationReportId, we can't mark a report as editing
        // because the report doesn't exist yet. This is handled by the frontend dirty tracking.
      }
    } else {
      console.warn(
        '❌ Not marking report as editing - no meter changes detected'
      );
    }

    // Get the final updated collection (with movement if recalculated)
    // CRITICAL: Use findOne with _id instead of findById (repo rule)
    let finalCollection = await Collections.findOne({ _id: collectionId }).lean();
    if (shouldCascade && updatedCollection.machineId) {
      try {
        await recalculateMachineCollections(
          String(updatedCollection.machineId)
        );
        finalCollection = await Collections.findOne({ _id: collectionId }).lean();
      } catch (recalcError) {
        console.error(
          'Failed to recalculate machine collections:',
          recalcError
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Collection updated successfully',
      data: finalCollection,
    });
  } catch (error) {
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

/**
 * Collection Report V2 — Submit Session
 *
 * PATCH /api/collection-reports-v2/sessions/[sessionId]/submit
 * Marks all reportedMachine documents for this session as submitted.
 * Persists sessionStartTime (if provided) and auto-sets sessionEndTime.
 */

import { connectDB } from '@/app/api/lib/middleware/db';
import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { Meters } from '@/app/api/lib/models/meters';
import { generateMongoId } from '@/lib/utils/id';
import {
  ensureLocationFolder,
  ensureMachineDateFolder,
  uploadImage,
  moveDriveFile,
  isFolderEmpty,
  deleteDriveFolder,
} from '@/lib/utils/drive';
import {
  extractUserFromRequest,
  logRouteError,
} from '@/app/api/lib/utils/routeLogger';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest, NextResponse } from 'next/server';
import type { MeterDocument } from '@/shared/types';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const functionName =
    'PATCH /api/collection-reports-v2/sessions/[sessionId]/submit';
  const user = extractUserFromRequest(req);

  let sessionId = '';

  try {
    // ============================================================================
    // STEP 1: Connect to database
    // ============================================================================
    await connectDB();

    // ============================================================================
    // STEP 2: Authenticate user
    // ============================================================================
    const userPayload = await getUserFromServer();
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // ============================================================================
    // STEP 3: Parse request body
    // ============================================================================
    sessionId = (await params).sessionId;
    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'sessionId is required' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestStartTime = body.sessionStartTime as string | undefined;
    const frontendImages =
      (body.images as
        | Array<{
            reportedMachineId: string;
            imageData: string;
            imageCapturedAt?: string;
          }>
        | undefined) ?? [];
    const sessionEndTime = new Date();
    const sessionStartTime = requestStartTime
      ? new Date(requestStartTime)
      : new Date();

    // ============================================================================
    // STEP 3.5: Chronological submit check (Middle-Date Block per Machine)
    // ============================================================================
    const sessionMachines = await ReportedMachine.find(
      { sessionId },
      'machineId sasEndTime'
    ).lean();

    for (const sm of sessionMachines) {
      if (!sm.machineId) continue;

      const targetTime = sm.sasEndTime
        ? new Date(sm.sasEndTime)
        : sessionEndTime;

      // Check if this machine is being inserted in the middle of its history
      const nextReport = await ReportedMachine.findOne({
        machineId: sm.machineId,
        sessionStatus: 'submitted',
        sessionId: { $ne: sessionId },
        sasEndTime: { $gt: targetTime },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      }).lean();

      if (nextReport) {
        const prevReport = await ReportedMachine.findOne({
          machineId: sm.machineId,
          sessionStatus: 'submitted',
          sessionId: { $ne: sessionId },
          sasEndTime: { $lt: targetTime },
          $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
        }).lean();

        if (prevReport) {
          return NextResponse.json(
            {
              success: false,
              error:
                'Chronological check failed: cannot insert a middle-date report. A more recent collection session has already been submitted for one or more of these machines. To proceed, you must revert or delete the newer session(s) first.',
            },
            { status: 400 }
          );
        }
      }
    }

    // ============================================================================
    // STEP 4: Mark session as submitted
    // ============================================================================
    const updateFields: Record<string, unknown> = {
      sessionStatus: 'submitted',
      sessionStartTime,
      sessionEndTime,
    };

    console.log(
      `[${functionName}] Submitting session:`,
      JSON.stringify(
        {
          sessionId,
          sessionStartTime: sessionStartTime.toISOString(),
          sessionEndTime: sessionEndTime.toISOString(),
          frontendImagesCount: frontendImages.length,
        },
        null,
        2
      )
    );

    const result = await ReportedMachine.updateMany(
      { sessionId },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    console.log(
      `[${functionName}] Session marked as submitted:`,
      JSON.stringify(
        {
          sessionId,
          matchedCount: result.matchedCount,
          modifiedCount: result.modifiedCount,
        },
        null,
        2
      )
    );

    // ============================================================================
    // STEP 5: Upload images to Google Drive
    // ============================================================================
    // Merge two sources:
    //   1. tempImageData stored in MongoDB during in-progress captures
    //   2. Legacy frontend-sent images array (for backwards compatibility)
    // Frontend images take precedence over stored tempImageData.
    // ============================================================================

    // Source 1: Fetch all machines that have tempImageData stored in the DB
    const machinesWithTempImages = (await ReportedMachine.find(
      { sessionId, tempImageData: { $exists: true, $ne: null } },
      '_id tempImageData locationName machineName machineCustomName sasEndTime'
    ).lean()) as Array<{
      _id: string;
      tempImageData: string;
      locationName: string;
      machineName: string;
      machineCustomName?: string;
      sasEndTime?: Date;
    }>;

    // Build a unified image list — frontend images override stored ones
    const frontendImageIds = new Set(
      frontendImages.map(img => img.reportedMachineId)
    );
    const allImages: Array<{
      reportedMachineId: string;
      imageData: string;
      imageCapturedAt?: string;
    }> = [
      // Stored images (only if no frontend override)
      ...machinesWithTempImages
        .filter(machine => !frontendImageIds.has(String(machine._id)))
        .map(machine => ({
          reportedMachineId: String(machine._id),
          imageData: machine.tempImageData,
        })),
      // Frontend images
      ...frontendImages,
    ];

    if (allImages.length > 0) {
      // Fetch machine metadata needed for folder path + file naming
      const machineIds = allImages.map(img => img.reportedMachineId);
      const machineRecords = await ReportedMachine.find(
        { _id: { $in: machineIds } },
        '_id locationName machineName machineCustomName sasEndTime'
      ).lean();

      const machineMap = new Map(
        machineRecords.map(m => [
          (m as { _id: string })._id.toString(),
          m as {
            _id: string;
            locationName: string;
            machineName: string;
            machineCustomName: string;
            sasEndTime?: Date;
          },
        ])
      );

      // Phase 1 — Create the shared location folder ONCE (sequential).
      // All machines in a session belong to the same location, so doing this
      // before the parallel uploads prevents a race condition where concurrent
      // Drive list+create calls each see "not found" and each create a duplicate.
      const firstMachine = machineMap.values().next().value as
        | { locationName: string }
        | undefined;
      const locationFolderId = firstMachine
        ? await ensureLocationFolder(firstMachine.locationName)
        : null;

      if (!locationFolderId) {
        console.error(
          '[submit] Could not resolve location folder — skipping Drive uploads'
        );
      } else {
        // Phase 2 — Upload each machine in parallel now that the location folder exists.
        await Promise.allSettled(
          allImages.map(
            async ({ reportedMachineId, imageData, imageCapturedAt }) => {
              try {
                const machine = machineMap.get(reportedMachineId);
                if (!machine) {
                  console.error(
                    `[submit] Machine not found for id ${reportedMachineId}`
                  );
                  return;
                }

                const machineDisplayName =
                  machine.machineCustomName || machine.machineName || 'machine';

                // Use the machine's sasEndTime as the folder date so that custom
                // SAS periods (e.g. a past report ending May 10) store photos in
                // the correct date folder rather than today's date.
                // Fall back to imageCapturedAt (actual photo time) then new Date().
                const folderDate = machine.sasEndTime
                  ? new Date(machine.sasEndTime)
                  : imageCapturedAt
                    ? new Date(imageCapturedAt)
                    : new Date();

                const timeStr = folderDate
                  .toISOString()
                  .replace(/[:.]/g, '-')
                  .slice(0, 19);
                const fileName = `${machineDisplayName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${timeStr}.jpg`;

                const folderId = await ensureMachineDateFolder({
                  locationFolderId,
                  machineName: machineDisplayName,
                  capturedAt: folderDate,
                });

                const driveFileId = await uploadImage({
                  base64Data: imageData,
                  fileName,
                  folderId,
                });

                // Save Drive reference and clear the temporary base64 data
                await ReportedMachine.updateOne(
                  { _id: reportedMachineId },
                  {
                    $set: {
                      driveFileId,
                      driveFolderId: folderId,
                      imageCapturedAt: folderDate,
                    },
                    $unset: { tempImageData: '' },
                  }
                );
              } catch (uploadError) {
                console.error(
                  `[submit] Drive upload failed for machine ${reportedMachineId}:`,
                  uploadError
                );
              }
            }
          )
        );
      }
    }

    // Clear tempImageData from any remaining machines (e.g. those without images
    // or where upload was skipped) to avoid storing large blobs permanently.
    await ReportedMachine.updateMany(
      { sessionId, tempImageData: { $exists: true } },
      { $unset: { tempImageData: '' } }
    );

    // ============================================================================
    // STEP 6: Relocate existing Drive photos when sasEndTime changed date since last submit
    // ============================================================================
    // When a user edits a session and changes the custom SAS end date (e.g. May 13 → May 8),
    // any photo already uploaded to the old date folder needs to be moved.
    // - If the old date folder is now empty → delete it.
    // - Always ensure the new date folder exists.

    const freshlyUploadedIds = new Set(
      allImages.map(img => img.reportedMachineId)
    );

    const machinesNeedingRelocation = (await ReportedMachine.find(
      {
        sessionId,
        driveFileId: { $exists: true, $ne: null },
        imageCapturedAt: { $exists: true, $ne: null },
      },
      '_id locationName machineName machineCustomName driveFileId driveFolderId sasEndTime imageCapturedAt'
    ).lean()) as Array<{
      _id: string;
      locationName: string;
      machineName: string;
      machineCustomName?: string;
      driveFileId: string;
      driveFolderId?: string;
      sasEndTime?: Date;
      imageCapturedAt?: Date;
    }>;

    // Filter to only machines where the date actually changed and aren't freshly uploaded
    const relocateCandidates = machinesNeedingRelocation.filter(machine => {
      if (freshlyUploadedIds.has(String(machine._id))) return false;
      if (!machine.sasEndTime || !machine.imageCapturedAt) return false;
      const newDateStr = new Date(machine.sasEndTime)
        .toISOString()
        .split('T')[0];
      const oldDateStr = new Date(machine.imageCapturedAt)
        .toISOString()
        .split('T')[0];
      return newDateStr !== oldDateStr;
    });

    if (relocateCandidates.length > 0) {
      // All machines share the same location — ensure the location folder once
      const locationFolderIdForReloc = await ensureLocationFolder(
        relocateCandidates[0].locationName
      ).catch(() => null);

      if (locationFolderIdForReloc) {
        await Promise.allSettled(
          relocateCandidates.map(async machine => {
            try {
              const machineDisplayName =
                machine.machineCustomName || machine.machineName || 'machine';
              const newSasEndTime = new Date(machine.sasEndTime!);

              // Ensure the new date folder for the updated sasEndTime
              const newFolderId = await ensureMachineDateFolder({
                locationFolderId: locationFolderIdForReloc,
                machineName: machineDisplayName,
                capturedAt: newSasEndTime,
              });

              // Move the Drive file to the new folder
              await moveDriveFile(
                machine.driveFileId,
                newFolderId,
                machine.driveFolderId
              );

              // Check if the old date folder is now empty — delete it if so
              if (machine.driveFolderId) {
                const empty = await isFolderEmpty(machine.driveFolderId);
                if (empty) {
                  await deleteDriveFolder(machine.driveFolderId).catch(
                    deleteError => {
                      console.error(
                        `[submit] Failed to delete empty old date folder ${machine.driveFolderId}:`,
                        deleteError
                      );
                    }
                  );
                }
              }

              // Update the machine record to reflect the new folder + date
              await ReportedMachine.updateOne(
                { _id: machine._id },
                {
                  $set: {
                    driveFolderId: newFolderId,
                    imageCapturedAt: newSasEndTime,
                  },
                }
              );
            } catch (relocateError) {
              console.error(
                `[submit] Failed to relocate Drive photo for machine ${machine._id}:`,
                relocateError
              );
            }
          })
        );
      }
    }

    // ============================================================================
    // STEP 7: Update Machine.collectionMeters and collectionTime
    // ============================================================================
    // After a session is fully submitted, persist the latest captured SAS meters
    // and sas end time back to the Machine document so it can be used as the
    // "previous" baseline for the NEXT collection report.
    // ============================================================================
    const submittedMachines = await ReportedMachine.find(
      {
        sessionId,
        status: { $in: ['captured', 'confirmed'] },
      },
      'machineId sasMetersIn sasMetersOut sasEndTime locationName locationId prevSasMetersIn prevSasMetersOut manualMetersIn manualMetersOut ramClear ramClearMetersIn ramClearMetersOut isSupplemental'
    ).lean<
      Array<{
        machineId: string;
        sasMetersIn: number | null;
        sasMetersOut: number | null;
        sasEndTime?: Date;
        locationName: string;
        locationId?: string;
        prevSasMetersIn?: number;
        prevSasMetersOut?: number;
        manualMetersIn?: number;
        manualMetersOut?: number;
        ramClear?: boolean;
        ramClearMetersIn?: number;
        ramClearMetersOut?: number;
        isSupplemental?: boolean;
      }>
    >();

    if (submittedMachines.length > 0) {
      // For non-relay machines (no relayId), mark every captured/confirmed machine
      // as metersMatch since there is no SAS relay to compare against.
      // We do this per-machine below inside the loop.

      // Derive the shared location ID for the GamingLocation previousCollectionTime update.
      const sessionLocationId = submittedMachines[0]?.locationId;

      await Promise.all(
        submittedMachines.map(async m => {
          const currentMachine = await Machine.findOne({
            _id: m.machineId,
          }).lean<{
            relayId?: string | null;
            collectionTime?: Date;
            gamingLocation?: string;
            collectionMeters?: { metersIn?: number; metersOut?: number };
            collectionMetersHistory?: Array<{
              _id?: string;
              metersIn?: number;
              metersOut?: number;
              prevMetersIn?: number;
              prevMetersOut?: number;
              timestamp?: Date;
              locationReportId?: string;
            }>;
          }>();

          // Per-machine SMIB check: if the machine has a relayId it has a SAS relay
          // and manual meters should NOT be used for Meter document creation.
          const machineHasRelay = !!currentMachine?.relayId;

          // For non-relay machines, mark metersMatch so submission succeeds.
          if (!machineHasRelay) {
            await ReportedMachine.findOneAndUpdate(
              {
                machineId: m.machineId,
                sessionId,
                status: { $in: ['captured', 'confirmed'] },
              },
              { $set: { metersMatch: true } }
            ).catch(() => undefined);
          }

          const targetMetersIn = !machineHasRelay
            ? (m.manualMetersIn ?? m.sasMetersIn)
            : m.sasMetersIn;
          const targetMetersOut = !machineHasRelay
            ? (m.manualMetersOut ?? m.sasMetersOut)
            : m.sasMetersOut;

          const meterLocationId = String(
            currentMachine?.gamingLocation || m.locationId || sessionLocationId || ''
          );

          console.log(
            `[${functionName}] Persisting machine meters:`,
            JSON.stringify(
              {
                machineId: m.machineId,
                locationName: m.locationName,
                isNoSmibMachine: !machineHasRelay,
                reportedSasIn: m.sasMetersIn,
                reportedSasOut: m.sasMetersOut,
                reportedManualIn: m.manualMetersIn,
                reportedManualOut: m.manualMetersOut,
                targetMetersIn,
                targetMetersOut,
              },
              null,
              2
            )
          );

          const updateFields: Record<string, unknown> = {
            'collectionMeters.metersIn': targetMetersIn,
            'collectionMeters.metersOut': targetMetersOut,
            collectionTime: m.sasEndTime ?? sessionEndTime,
            previousCollectionTime: currentMachine?.collectionTime || undefined,
            updatedAt: new Date(),
          };

          // For non-relay machines AND offline SMIB (supplemental) machines: mirror the
          // collector's entered values into sasMeters so dashboard queries reflect the
          // correct figures. Online SMIB machines have these fields owned by the live relay.
          if (!machineHasRelay || m.isSupplemental === true) {
            updateFields['sasMeters.drop'] = targetMetersIn ?? null;
            updateFields['sasMeters.totalCancelledCredits'] =
              targetMetersOut ?? null;
          }

          const existingHistoryEntry = (
            currentMachine?.collectionMetersHistory ?? []
          ).find(entry => entry.locationReportId === sessionId);

          const machineUpdateOps: Record<string, unknown> = {
            $set: updateFields,
          };

          if (!existingHistoryEntry && currentMachine) {
            const prevIn =
              m.prevSasMetersIn ??
              currentMachine.collectionMeters?.metersIn ??
              0;
            const prevOut =
              m.prevSasMetersOut ??
              currentMachine.collectionMeters?.metersOut ??
              0;

            const historyEntryId = await generateMongoId();
            const historyEntry = {
              _id: historyEntryId,
              metersIn: targetMetersIn ?? 0,
              metersOut: targetMetersOut ?? 0,
              prevMetersIn: prevIn,
              prevMetersOut: prevOut,
              timestamp: m.sasEndTime ?? sessionEndTime,
              locationReportId: sessionId,
            };

            machineUpdateOps.$push = {
              collectionMetersHistory: historyEntry,
            };
          }

          await Machine.findOneAndUpdate(
            { _id: m.machineId },
            machineUpdateOps
          ).catch(machineUpdateError => {
            console.error(
              `[submit] Failed to update Machine.collectionMeters for ${m.machineId}:`,
              machineUpdateError
            );
          });

          // For non-relay machines, enforce null on all SAS meter fields stored
          // on the ReportedMachine document. Stale non-null values from sessions
          // captured before this rule existed are wiped here on every submit.
          if (!machineHasRelay) {
            await ReportedMachine.findOneAndUpdate(
              { machineId: m.machineId, sessionId },
              {
                $set: { sasMetersIn: null, sasMetersOut: null, sasGross: null },
              }
            ).catch(err => {
              console.error(
                `[submit] Failed to clear stale SAS fields on ReportedMachine for ${m.machineId}:`,
                err
              );
            });
          }

          // If the machine has no relay (non-SMIB), upsert the Meter document(s).
          // On first submit: no existing meter — create one.
          // On re-submit after editing: a meter already exists for this
          // machine + session — delete it first, then create with the
          // updated values so there are never duplicate meter records.
          //
          // When ramClear is true, create TWO meter docs (mirrors V1):
          //   1. RAM clear meter: pre-reset drop (peak - prev), isRamClear=true
          //   2. Current meter: post-reset drop (current - 0)
          // Otherwise create ONE meter doc with the normal delta.
          if (!machineHasRelay || m.isSupplemental === true) {
            // Resolve the true "before this session" meter values.
            // Priority:
            //   1. existingHistoryEntry.prevMetersIn/Out — written once at
            //      first-submit time and never mutated. This is the ground truth
            //      even after collectionMeters has been overwritten by the submit.
            //   2. m.prevSasMetersIn/Out — stored on the ReportedMachine at
            //      original capture time (before any edit poisoned it).
            //   3. 0 — absolute fallback for brand-new first-ever captures.
            const prevIn =
              existingHistoryEntry?.prevMetersIn ?? m.prevSasMetersIn ?? 0;
            const prevOut =
              existingHistoryEntry?.prevMetersOut ?? m.prevSasMetersOut ?? 0;

            // STEP 1: Remove any existing meter(s) for this machine + session.
            // deleteMany handles the ramClear case where 2 docs may exist.
            await Meters.deleteMany({
              machine: m.machineId,
              locationSession: sessionId,
            }).catch(deleteErr => {
              console.error(
                `[submit] Failed to delete existing Meters for machine ${m.machineId} session ${sessionId}:`,
                deleteErr
              );
            });

            const baseReadAt = m.sasEndTime ?? sessionEndTime;
            const isRamClear =
              m.ramClear === true &&
              m.ramClearMetersIn !== undefined &&
              m.ramClearMetersOut !== undefined;

            let prevMeterDoc: MeterDocument | null = null;
            if (m.isSupplemental === true) {
              prevMeterDoc = await Meters.findOne({
                machine: m.machineId,
                locationSession: { $ne: sessionId },
                readAt: { $lt: baseReadAt },
                $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
              })
                .sort({ readAt: -1 })
                .lean<MeterDocument>();
            }

            if (isRamClear) {
              // STEP 2a: RAM clear meter — captures drop up to the reset point.
              const ramClearMeterId = await generateMongoId();
              const ramClearMeterDoc = {
                _id: ramClearMeterId,
                machine: m.machineId,
                location: meterLocationId,
                locationSession: sessionId,
                isRamClear: true,
                movement: {
                  coinIn: 0,
                  coinOut: 0,
                  totalCancelledCredits:
                    (m.ramClearMetersOut as number) - prevOut,
                  totalHandPaidCancelledCredits: 0,
                  totalWonCredits: 0,
                  drop: (m.ramClearMetersIn as number) - prevIn,
                  jackpot: 0,
                  currentCredits: 0,
                  gamesPlayed: 0,
                  gamesWon: 0,
                },
                coinIn:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.coinIn || 0
                    : 0,
                coinOut:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.coinOut || 0
                    : 0,
                totalCancelledCredits: m.ramClearMetersOut as number,
                totalHandPaidCancelledCredits:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.totalHandPaidCancelledCredits || 0
                    : 0,
                totalWonCredits:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.totalWonCredits || 0
                    : 0,
                drop: m.ramClearMetersIn as number,
                jackpot:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.jackpot || 0
                    : 0,
                currentCredits:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.currentCredits || 0
                    : 0,
                gamesPlayed:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.gamesPlayed || 0
                    : 0,
                gamesWon:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.gamesWon || 0
                    : 0,
                meterSource: 'COLLECTION_REPORT' as const,
                isSupplemental: m.isSupplemental === true,
                readAt: new Date(
                  (baseReadAt instanceof Date
                    ? baseReadAt
                    : new Date(baseReadAt)
                  ).getTime() - 1000
                ), // 1 second behind
                createdAt: new Date(),
              };

              await Meters.create(ramClearMeterDoc).catch(meterCreateError => {
                console.error(
                  `[submit] Failed to create RAM-clear Meter for machine ${m.machineId}:`,
                  meterCreateError
                );
              });

              // STEP 2b: Current meter — captures drop from 0 after reset.
              const currentMeterId = await generateMongoId();
              const currentMeterDoc = {
                _id: currentMeterId,
                machine: m.machineId,
                location: meterLocationId,
                locationSession: sessionId,
                isRamClear: false,
                movement: {
                  coinIn: 0,
                  coinOut: 0,
                  totalCancelledCredits: m.manualMetersOut ?? 0,
                  totalHandPaidCancelledCredits: 0,
                  totalWonCredits: 0,
                  drop: m.manualMetersIn ?? 0,
                  jackpot: 0,
                  currentCredits: 0,
                  gamesPlayed: 0,
                  gamesWon: 0,
                },
                coinIn: 0,
                coinOut: 0,
                totalCancelledCredits: m.manualMetersOut ?? null,
                totalHandPaidCancelledCredits: 0,
                totalWonCredits: 0,
                drop: m.manualMetersIn ?? null,
                jackpot: 0,
                currentCredits: 0,
                gamesPlayed: 0,
                gamesWon: 0,
                meterSource: 'COLLECTION_REPORT' as const,
                isSupplemental: m.isSupplemental === true,
                readAt: baseReadAt, // exactly at collection time
                createdAt: new Date(new Date().getTime() + 1000),
              };

              await Meters.create(currentMeterDoc).catch(meterCreateError => {
                console.error(
                  `[submit] Failed to create post-RAM-clear Meter for machine ${m.machineId}:`,
                  meterCreateError
                );
              });
            } else {
              // Non-RAM-clear path: single Meter doc with the normal delta.
              const meterId = await generateMongoId();
              const meterDoc = {
                _id: meterId,
                machine: m.machineId,
                location: meterLocationId,
                locationSession: sessionId,
                movement: {
                  coinIn: 0,
                  coinOut: 0,
                  totalCancelledCredits: (m.manualMetersOut ?? 0) - prevOut,
                  totalHandPaidCancelledCredits: 0,
                  totalWonCredits: 0,
                  drop: (m.manualMetersIn ?? 0) - prevIn,
                  jackpot: 0,
                  currentCredits: 0,
                  gamesPlayed: 0,
                  gamesWon: 0,
                },
                coinIn:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.coinIn || 0
                    : 0,
                coinOut:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.coinOut || 0
                    : 0,
                totalCancelledCredits: m.manualMetersOut ?? null,
                totalHandPaidCancelledCredits:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.totalHandPaidCancelledCredits || 0
                    : 0,
                totalWonCredits:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.totalWonCredits || 0
                    : 0,
                drop: m.manualMetersIn ?? null,
                jackpot:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.jackpot || 0
                    : 0,
                currentCredits:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.currentCredits || 0
                    : 0,
                gamesPlayed:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.gamesPlayed || 0
                    : 0,
                gamesWon:
                  m.isSupplemental === true && prevMeterDoc
                    ? prevMeterDoc.gamesWon || 0
                    : 0,
                meterSource: 'COLLECTION_REPORT' as const,
                isSupplemental: m.isSupplemental === true,
                readAt: baseReadAt,
                createdAt: new Date(),
              };

              await Meters.create(meterDoc).catch(meterCreateError => {
                console.error(
                  `[submit] Failed to create Meter document for machine ${m.machineId}:`,
                  meterCreateError
                );
              });
            }
          }
        })
      );

      // ============================================================================
      // Update GamingLocation previousCollectionTime
      // ============================================================================
      if (sessionLocationId) {
        let maxSasEndTime: Date | undefined;
        for (const m of submittedMachines) {
          if (m.sasEndTime) {
            const colSasTime = new Date(m.sasEndTime);
            if (!maxSasEndTime || colSasTime > maxSasEndTime) {
              maxSasEndTime = colSasTime;
            }
          }
        }
        if (maxSasEndTime) {
          await GamingLocations.findOneAndUpdate(
            { _id: sessionLocationId },
            { $set: { previousCollectionTime: maxSasEndTime } }
          ).catch(err => {
            console.error(
              `[submit] Failed to update GamingLocation.previousCollectionTime for ${sessionLocationId}:`,
              err
            );
          });
        }
      }
    }

    // ============================================================================
    // STEP 8: Log Activity
    // ============================================================================
    try {
      const reportMachines = (await ReportedMachine.find({
        sessionId,
      }).lean()) as import('@/app/api/lib/models/reportedMachines').ReportedMachineDocument[];
      const firstReportedMachine = reportMachines[0];
      const locationName =
        firstReportedMachine?.locationName || 'Unknown Location';
      const collectorName =
        firstReportedMachine?.collectorName ||
        firstReportedMachine?.collector ||
        'Unknown Collector';

      let amountCollected = 0;
      reportMachines.forEach(rm => {
        if (rm.metersMatch) {
          amountCollected += (rm.sasMetersIn ?? 0) - (rm.sasMetersOut ?? 0);
        } else {
          amountCollected +=
            (rm.manualMetersIn ?? 0) - (rm.manualMetersOut ?? 0);
        }
      });

      const createChanges: Array<{
        field: string;
        oldValue: null;
        newValue: string | number;
      }> = [
        { field: 'locationName', oldValue: null, newValue: locationName },
        { field: 'collector', oldValue: null, newValue: collectorName },
        { field: 'amountCollected', oldValue: null, newValue: amountCollected },
        { field: 'machines', oldValue: null, newValue: reportMachines.length },
      ];

      reportMachines.forEach((machineItem, index) => {
        const machineName =
          machineItem.machineCustomName ||
          machineItem.machineName ||
          machineItem.serialNumber ||
          `Machine ${index + 1}`;
        createChanges.push({
          field: `machine_${index}_details`,
          oldValue: null,
          newValue: `${machineName}: In: ${machineItem.sasMetersIn}, Out: ${machineItem.sasMetersOut}${machineItem.manualMetersIn !== undefined ? ` (Manual: ${machineItem.manualMetersIn} In, ${machineItem.manualMetersOut} Out)` : ''}${machineItem.notes ? `, Notes: ${machineItem.notes}` : ''}`,
        });
      });

      await logActivity({
        action: 'CREATE',
        details: `Created collection report for ${locationName} by ${collectorName} (${reportMachines.length} machines, $${amountCollected} collected)`,
        ipAddress: getClientIP(req) || undefined,
        userAgent: req.headers.get('user-agent') || undefined,
        userId: userPayload._id as string,
        username: userPayload.emailAddress as string,
        metadata: {
          userId: userPayload._id as string,
          userEmail: userPayload.emailAddress as string,
          userRole: (userPayload.roles as string[])?.[0] || 'user',
          resource: 'collection-report',
          resourceId: sessionId,
          resourceName: `${locationName} - ${collectorName}`,
          changes: createChanges,
        },
      });
    } catch (logError) {
      console.error(
        'Failed to log collection report V2 submit activity:',
        logError
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        sessionId,
        machinesUpdated: result.modifiedCount,
        sessionStartTime: sessionStartTime?.toISOString(),
        sessionEndTime: sessionEndTime.toISOString(),
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Internal server error';
    logRouteError(
      functionName,
      'PATCH',
      `/api/collection-reports-v2/sessions/${sessionId}/submit`,
      errorMessage,
      user
    );
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

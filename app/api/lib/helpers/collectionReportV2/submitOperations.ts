/**
 * Collection Report V2 — Submit Operations Helper
 *
 * Extracted helper functions for the session submit route. Handles chronological
 * validation, image uploads to Google Drive, Drive photo relocation, machine meter
 * persistence, and activity logging.
 *
 * @module app/api/lib/helpers/collectionReportV2/submitOperations
 */

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
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { getClientIP } from '@/lib/utils/ipAddress';
import type { NextRequest } from 'next/server';
import type { MeterDocument } from '@/shared/types';

// ============================================================================
// Types
// ============================================================================

type ImageEntry = {
  reportedMachineId: string;
  imageData: string;
  imageCapturedAt?: string;
};

type MachineWithTempImage = {
  _id: string;
  tempImageData: string;
  locationName: string;
  machineName: string;
  machineCustomName?: string;
  sasEndTime?: Date;
};

type MachineForRelocation = {
  _id: string;
  locationName: string;
  machineName: string;
  machineCustomName?: string;
  driveFileId: string;
  driveFolderId?: string;
  sasEndTime?: Date;
  imageCapturedAt?: Date;
};

type MachineForMeterPersistence = {
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
};

type MachineForActivityLog = {
  locationName: string;
  collectorName?: string;
  collector?: string;
  machineCustomName?: string;
  machineName?: string;
  serialNumber?: string;
  sasMetersIn?: number | null;
  sasMetersOut?: number | null;
  manualMetersIn?: number;
  manualMetersOut?: number;
  metersMatch?: boolean;
  notes?: string;
};

type ActivityChange = {
  field: string;
  oldValue: null;
  newValue: string | number;
};

type CurrentMachineForSubmit = {
  relayId?: string | null;
  collectionTime?: Date;
  gamingLocation?: string;
  collectionMeters?: { metersIn?: number; metersOut?: number };
  collectionMetersHistory?: CollectionMetersHistoryEntry[];
};

type CollectionMetersHistoryEntry = {
  _id?: string;
  metersIn?: number;
  metersOut?: number;
  prevMetersIn?: number;
  prevMetersOut?: number;
  timestamp?: Date;
  locationReportId?: string;
};

// ============================================================================
// Chronological Validation
// ============================================================================

/**
 * Validates that submitting a session would not create a middle-date insertion
 * for any of its machines. Returns an error message if a chronological conflict
 * is detected, or null if the submission is safe.
 *
 * @param {string} sessionId - The session being submitted
 * @param {Date} sessionEndTime - The end time for this submission
 * @returns {Promise<string | null>} Error message if conflict found, null otherwise
 */
export async function validateChronologicalSubmit(
  sessionId: string,
  sessionEndTime: Date
): Promise<string | null> {
  const sessionMachines = await ReportedMachine.find(
    { sessionId },
    'machineId sasEndTime'
  ).lean<Array<{ machineId: string; sasEndTime?: Date }>>();

  for (const sessionMachine of sessionMachines) {
    if (!sessionMachine.machineId) continue;

    const targetTime = sessionMachine.sasEndTime
      ? new Date(sessionMachine.sasEndTime)
      : sessionEndTime;

    const nextReport = await ReportedMachine.findOne({
      machineId: sessionMachine.machineId,
      sessionStatus: 'submitted',
      sessionId: { $ne: sessionId },
      sasEndTime: { $gt: targetTime },
      $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
    }).lean<{ _id: string }>();

    if (nextReport) {
      const prevReport = await ReportedMachine.findOne({
        machineId: sessionMachine.machineId,
        sessionStatus: 'submitted',
        sessionId: { $ne: sessionId },
        sasEndTime: { $lt: targetTime },
        $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
      }).lean<{ _id: string }>();

      if (prevReport) {
        return 'Chronological check failed: cannot insert a middle-date report. A more recent collection session has already been submitted for one or more of these machines. To proceed, you must revert or delete the newer session(s) first.';
      }
    }
  }

  return null;
}

// ============================================================================
// Image Upload
// ============================================================================

/**
 * Handles all image upload operations for a submitted session. Merges temp image
 * data stored in MongoDB with frontend-sent images, uploads to Google Drive in
 * parallel, and cleans up temporary data.
 *
 * @param {string} sessionId - The session being submitted
 * @param {ImageEntry[]} frontendImages - Images sent from the frontend
 * @returns {Promise<ImageEntry[]>} All images that were uploaded (for relocation exclusion)
 */
export async function uploadSessionImages(
  sessionId: string,
  frontendImages: ImageEntry[]
): Promise<ImageEntry[]> {
  const machinesWithTempImages = await ReportedMachine.find(
    { sessionId, tempImageData: { $exists: true, $ne: null } },
    '_id tempImageData locationName machineName machineCustomName sasEndTime'
  ).lean<MachineWithTempImage[]>();

  const frontendImageIds = new Set(
    frontendImages.map(img => img.reportedMachineId)
  );

  const allImages: ImageEntry[] = [
    ...machinesWithTempImages
      .filter(machine => !frontendImageIds.has(String(machine._id)))
      .map(machine => ({
        reportedMachineId: String(machine._id),
        imageData: machine.tempImageData,
      })),
    ...frontendImages,
  ];

  if (allImages.length === 0) {
    await ReportedMachine.updateMany(
      { sessionId, tempImageData: { $exists: true } },
      { $unset: { tempImageData: '' } }
    );
    return allImages;
  }

  const machineIds = allImages.map(img => img.reportedMachineId);
  const machineRecords = await ReportedMachine.find(
    { _id: { $in: machineIds } },
    '_id locationName machineName machineCustomName sasEndTime'
  ).lean<
    Array<{
      _id: string;
      locationName: string;
      machineName: string;
      machineCustomName: string;
      sasEndTime?: Date;
    }>
  >();

  const machineMap = new Map(
    machineRecords.map(record => [String(record._id), record])
  );

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

  await ReportedMachine.updateMany(
    { sessionId, tempImageData: { $exists: true } },
    { $unset: { tempImageData: '' } }
  );

  return allImages;
}

// ============================================================================
// Drive Photo Relocation
// ============================================================================

/**
 * Relocates existing Drive photos when the sasEndTime changed date since the
 * last submit. Moves photos to the correct date folder and deletes empty old
 * folders.
 *
 * @param {string} sessionId - The session being submitted
 * @param {Set<string>} freshlyUploadedIds - IDs of machines that just had images uploaded (excluded from relocation)
 */
export async function relocateDrivePhotos(
  sessionId: string,
  freshlyUploadedIds: Set<string>
): Promise<void> {
  const machinesNeedingRelocation = await ReportedMachine.find(
    {
      sessionId,
      driveFileId: { $exists: true, $ne: null },
      imageCapturedAt: { $exists: true, $ne: null },
    },
    '_id locationName machineName machineCustomName driveFileId driveFolderId sasEndTime imageCapturedAt'
  ).lean<MachineForRelocation[]>();

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

  if (relocateCandidates.length === 0) return;

  const locationFolderId = await ensureLocationFolder(
    relocateCandidates[0].locationName
  ).catch(() => null);

  if (!locationFolderId) return;

  await Promise.allSettled(
    relocateCandidates.map(async machine => {
      try {
        const machineDisplayName =
          machine.machineCustomName || machine.machineName || 'machine';
        const newSasEndTime = new Date(machine.sasEndTime!);

        const newFolderId = await ensureMachineDateFolder({
          locationFolderId,
          machineName: machineDisplayName,
          capturedAt: newSasEndTime,
        });

        await moveDriveFile(
          machine.driveFileId,
          newFolderId,
          machine.driveFolderId
        );

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

// ============================================================================
// Machine Meter Persistence
// ============================================================================

/**
 * Persists submitted machine meters back to the Machine document. Updates
 * collectionMeters, creates collectionMetersHistory entries if needed, and
 * creates Meter documents for non-relay or supplemental machines.
 *
 * @param {string} sessionId - The session being submitted
 * @param {MachineForMeterPersistence[]} submittedMachines - Machines with captured/confirmed status
 * @param {Date} sessionEndTime - The session end time
 */
export async function persistMachineMetersOnSubmit(
  sessionId: string,
  submittedMachines: MachineForMeterPersistence[],
  sessionEndTime: Date
): Promise<void> {
  const sessionLocationId = submittedMachines[0]?.locationId;

  await Promise.all(
    submittedMachines.map(async submittedMachine => {
      const currentMachine = await Machine.findOne({
        _id: submittedMachine.machineId,
      }).lean<CurrentMachineForSubmit>();

      const machineHasRelay = !!currentMachine?.relayId;

      if (!machineHasRelay) {
        await ReportedMachine.findOneAndUpdate(
          {
            machineId: submittedMachine.machineId,
            sessionId,
            status: { $in: ['captured', 'confirmed'] },
          },
          { $set: { metersMatch: true } }
        ).catch(() => undefined);
      }

      const targetMetersIn = !machineHasRelay
        ? (submittedMachine.manualMetersIn ?? submittedMachine.sasMetersIn)
        : submittedMachine.sasMetersIn;
      const targetMetersOut = !machineHasRelay
        ? (submittedMachine.manualMetersOut ?? submittedMachine.sasMetersOut)
        : submittedMachine.sasMetersOut;

      const meterLocationId = String(
        currentMachine?.gamingLocation ||
          submittedMachine.locationId ||
          sessionLocationId ||
          ''
      );

      const machineUpdateFields: Record<string, unknown> = {
        'collectionMeters.metersIn': targetMetersIn,
        'collectionMeters.metersOut': targetMetersOut,
        collectionTime: submittedMachine.sasEndTime ?? sessionEndTime,
        previousCollectionTime: currentMachine?.collectionTime || undefined,
        updatedAt: new Date(),
      };

      if (!machineHasRelay || submittedMachine.isSupplemental === true) {
        machineUpdateFields['sasMeters.drop'] = targetMetersIn ?? null;
        machineUpdateFields['sasMeters.totalCancelledCredits'] =
          targetMetersOut ?? null;
      }

      const existingHistoryEntry = (
        currentMachine?.collectionMetersHistory ?? []
      ).find(entry => entry.locationReportId === sessionId);

      const machineUpdateOps: Record<string, unknown> = {
        $set: machineUpdateFields,
      };

      if (!existingHistoryEntry && currentMachine) {
        const prevIn =
          submittedMachine.prevSasMetersIn ??
          currentMachine.collectionMeters?.metersIn ??
          0;
        const prevOut =
          submittedMachine.prevSasMetersOut ??
          currentMachine.collectionMeters?.metersOut ??
          0;

        const historyEntryId = await generateMongoId();
        const historyEntry = {
          _id: historyEntryId,
          metersIn: targetMetersIn ?? 0,
          metersOut: targetMetersOut ?? 0,
          prevMetersIn: prevIn,
          prevMetersOut: prevOut,
          timestamp: submittedMachine.sasEndTime ?? sessionEndTime,
          locationReportId: sessionId,
        };

        machineUpdateOps.$push = {
          collectionMetersHistory: historyEntry,
        };
      }

      await Machine.findOneAndUpdate(
        { _id: submittedMachine.machineId },
        machineUpdateOps
      ).catch(machineUpdateError => {
        console.error(
          `[submit] Failed to update Machine.collectionMeters for ${submittedMachine.machineId}:`,
          machineUpdateError
        );
      });

      if (!machineHasRelay) {
        await ReportedMachine.findOneAndUpdate(
          { machineId: submittedMachine.machineId, sessionId },
          {
            $set: { sasMetersIn: null, sasMetersOut: null, sasGross: null },
          }
        ).catch(clearError => {
          console.error(
            `[submit] Failed to clear stale SAS fields on ReportedMachine for ${submittedMachine.machineId}:`,
            clearError
          );
        });
      }

      if (!machineHasRelay || submittedMachine.isSupplemental === true) {
        await createMeterDocuments(
          submittedMachine,
          meterLocationId,
          sessionId,
          sessionEndTime,
          existingHistoryEntry
        );
      }
    })
  );

  if (sessionLocationId) {
    let maxSasEndTime: Date | undefined;
    for (const submittedMachine of submittedMachines) {
      if (submittedMachine.sasEndTime) {
        const collectionSasTime = new Date(submittedMachine.sasEndTime);
        if (!maxSasEndTime || collectionSasTime > maxSasEndTime) {
          maxSasEndTime = collectionSasTime;
        }
      }
    }
    if (maxSasEndTime) {
      await GamingLocations.findOneAndUpdate(
        { _id: sessionLocationId },
        { $set: { previousCollectionTime: maxSasEndTime } }
      ).catch(locationUpdateError => {
        console.error(
          `[submit] Failed to update GamingLocation.previousCollectionTime for ${sessionLocationId}:`,
          locationUpdateError
        );
      });
    }
  }
}

// ============================================================================
// Meter Document Creation (Internal)
// ============================================================================

/**
 * Creates Meter document(s) for a machine that has no SAS relay or is supplemental.
 * Handles both normal delta and RAM clear (two meter docs) scenarios.
 *
 * @param {MachineForMeterPersistence} machineData - The submitted machine data
 * @param {string} meterLocationId - The resolved location ID for the meter
 * @param {string} sessionId - The session ID
 * @param {Date} sessionEndTime - The session end time
 * @param {CollectionMetersHistoryEntry | undefined} existingHistoryEntry - Existing history entry for this session
 */
async function createMeterDocuments(
  machineData: MachineForMeterPersistence,
  meterLocationId: string,
  sessionId: string,
  sessionEndTime: Date,
  existingHistoryEntry: CollectionMetersHistoryEntry | undefined
): Promise<void> {
  const prevIn =
    existingHistoryEntry?.prevMetersIn ?? machineData.prevSasMetersIn ?? 0;
  const prevOut =
    existingHistoryEntry?.prevMetersOut ?? machineData.prevSasMetersOut ?? 0;

  await Meters.deleteMany({
    machine: machineData.machineId,
    locationSession: sessionId,
  }).catch(deleteError => {
    console.error(
      `[submit] Failed to delete existing Meters for machine ${machineData.machineId} session ${sessionId}:`,
      deleteError
    );
  });

  const baseReadAt = machineData.sasEndTime ?? sessionEndTime;
  const isRamClear =
    machineData.ramClear === true &&
    machineData.ramClearMetersIn !== undefined &&
    machineData.ramClearMetersOut !== undefined;

  let prevMeterDoc: MeterDocument | null = null;
  if (machineData.isSupplemental === true) {
    prevMeterDoc = await Meters.findOne({
      machine: machineData.machineId,
      locationSession: { $ne: sessionId },
      readAt: { $lt: baseReadAt },
      $or: [{ deletedAt: { $exists: false } }, { deletedAt: null }],
    })
      .sort({ readAt: -1 })
      .lean<MeterDocument>();
  }

  const supplementalCoinIn =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.coinIn || 0
      : 0;
  const supplementalCoinOut =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.coinOut || 0
      : 0;
  const supplementalHandPaid =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.totalHandPaidCancelledCredits || 0
      : 0;
  const supplementalWonCredits =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.totalWonCredits || 0
      : 0;
  const supplementalJackpot =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.jackpot || 0
      : 0;
  const supplementalCurrentCredits =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.currentCredits || 0
      : 0;
  const supplementalGamesPlayed =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.gamesPlayed || 0
      : 0;
  const supplementalGamesWon =
    machineData.isSupplemental === true && prevMeterDoc
      ? prevMeterDoc.gamesWon || 0
      : 0;

  if (isRamClear) {
    const ramClearMeterId = await generateMongoId();
    const ramClearMeterDoc = {
      _id: ramClearMeterId,
      machine: machineData.machineId,
      location: meterLocationId,
      locationSession: sessionId,
      isRamClear: true,
      movement: {
        coinIn: 0,
        coinOut: 0,
        totalCancelledCredits:
          (machineData.ramClearMetersOut as number) - prevOut,
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: 0,
        drop: (machineData.ramClearMetersIn as number) - prevIn,
        jackpot: 0,
        currentCredits: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      },
      coinIn: supplementalCoinIn,
      coinOut: supplementalCoinOut,
      totalCancelledCredits: machineData.ramClearMetersOut as number,
      totalHandPaidCancelledCredits: supplementalHandPaid,
      totalWonCredits: supplementalWonCredits,
      drop: machineData.ramClearMetersIn as number,
      jackpot: supplementalJackpot,
      currentCredits: supplementalCurrentCredits,
      gamesPlayed: supplementalGamesPlayed,
      gamesWon: supplementalGamesWon,
      meterSource: 'COLLECTION_REPORT' as const,
      isSupplemental: machineData.isSupplemental === true,
      readAt: new Date(
        (baseReadAt instanceof Date
          ? baseReadAt
          : new Date(baseReadAt)
        ).getTime() - 1000
      ),
      createdAt: new Date(),
    };

    await Meters.create(ramClearMeterDoc).catch(meterCreateError => {
      console.error(
        `[submit] Failed to create RAM-clear Meter for machine ${machineData.machineId}:`,
        meterCreateError
      );
    });

    const currentMeterId = await generateMongoId();
    const currentMeterDoc = {
      _id: currentMeterId,
      machine: machineData.machineId,
      location: meterLocationId,
      locationSession: sessionId,
      isRamClear: false,
      movement: {
        coinIn: 0,
        coinOut: 0,
        totalCancelledCredits: machineData.manualMetersOut ?? 0,
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: 0,
        drop: machineData.manualMetersIn ?? 0,
        jackpot: 0,
        currentCredits: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      },
      coinIn: 0,
      coinOut: 0,
      totalCancelledCredits: machineData.manualMetersOut ?? null,
      totalHandPaidCancelledCredits: 0,
      totalWonCredits: 0,
      drop: machineData.manualMetersIn ?? null,
      jackpot: 0,
      currentCredits: 0,
      gamesPlayed: 0,
      gamesWon: 0,
      meterSource: 'COLLECTION_REPORT' as const,
      isSupplemental: machineData.isSupplemental === true,
      readAt: baseReadAt,
      createdAt: new Date(new Date().getTime() + 1000),
    };

    await Meters.create(currentMeterDoc).catch(meterCreateError => {
      console.error(
        `[submit] Failed to create post-RAM-clear Meter for machine ${machineData.machineId}:`,
        meterCreateError
      );
    });
  } else {
    const meterId = await generateMongoId();
    const meterDoc = {
      _id: meterId,
      machine: machineData.machineId,
      location: meterLocationId,
      locationSession: sessionId,
      movement: {
        coinIn: 0,
        coinOut: 0,
        totalCancelledCredits: (machineData.manualMetersOut ?? 0) - prevOut,
        totalHandPaidCancelledCredits: 0,
        totalWonCredits: 0,
        drop: (machineData.manualMetersIn ?? 0) - prevIn,
        jackpot: 0,
        currentCredits: 0,
        gamesPlayed: 0,
        gamesWon: 0,
      },
      coinIn: supplementalCoinIn,
      coinOut: supplementalCoinOut,
      totalCancelledCredits: machineData.manualMetersOut ?? null,
      totalHandPaidCancelledCredits: supplementalHandPaid,
      totalWonCredits: supplementalWonCredits,
      drop: machineData.manualMetersIn ?? null,
      jackpot: supplementalJackpot,
      currentCredits: supplementalCurrentCredits,
      gamesPlayed: supplementalGamesPlayed,
      gamesWon: supplementalGamesWon,
      meterSource: 'COLLECTION_REPORT' as const,
      isSupplemental: machineData.isSupplemental === true,
      readAt: baseReadAt,
      createdAt: new Date(),
    };

    await Meters.create(meterDoc).catch(meterCreateError => {
      console.error(
        `[submit] Failed to create Meter document for machine ${machineData.machineId}:`,
        meterCreateError
      );
    });
  }
}

// ============================================================================
// Activity Logging
// ============================================================================

/**
 * Logs the submit activity as a collection report creation event. Calculates
 * the total amount collected and builds a detailed change log for all machines
 * in the session.
 *
 * @param {string} sessionId - The session being submitted
 * @param {NextRequest} req - The incoming request
 * @param {{ _id: string; emailAddress: string; roles?: string[] }} userPayload - The authenticated user
 */
export async function logSubmitActivity(
  sessionId: string,
  req: NextRequest,
  userPayload: { _id: string; emailAddress: string; roles?: string[] }
): Promise<void> {
  const reportMachines = await ReportedMachine.find({
    sessionId,
  }).lean<MachineForActivityLog[]>();

  const firstReportedMachine = reportMachines[0];
  const locationName =
    firstReportedMachine?.locationName || 'Unknown Location';
  const collectorName =
    firstReportedMachine?.collectorName ||
    firstReportedMachine?.collector ||
    'Unknown Collector';

  let amountCollected = 0;
  reportMachines.forEach(reportedMachine => {
    if (reportedMachine.metersMatch) {
      amountCollected +=
        (reportedMachine.sasMetersIn ?? 0) -
        (reportedMachine.sasMetersOut ?? 0);
    } else {
      amountCollected +=
        (reportedMachine.manualMetersIn ?? 0) -
        (reportedMachine.manualMetersOut ?? 0);
    }
  });

  const createChanges: ActivityChange[] = [
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
    userId: userPayload._id,
    username: userPayload.emailAddress,
    metadata: {
      userId: userPayload._id,
      userEmail: userPayload.emailAddress,
      userRole: (userPayload.roles as string[])?.[0] || 'user',
      resource: 'collection-report',
      resourceId: sessionId,
      resourceName: `${locationName} - ${collectorName}`,
      changes: createChanges,
    },
  });
}

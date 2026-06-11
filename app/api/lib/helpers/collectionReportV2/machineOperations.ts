/**
 * Collection Report V2 — Machine Operations Helper
 *
 * Business logic extracted from the POST/PATCH /api/collection-reports-v2/machines
 * route handlers. Covers payload validation, document construction, chronological
 * checks, update-data assembly, movement recalculation, image handling, and
 * post-submit cascading.
 *
 * @module app/api/lib/helpers/collectionReportV2/machineOperations
 */

import { ReportedMachine } from '@/app/api/lib/models/reportedMachines';
import { deleteDriveFile } from '@/lib/utils/drive';
import { computeMovement } from '@/app/api/lib/helpers/collectionReportV2/movement';
import {
  cascadeMachineEdit,
  propagateV2MetersToNextSession,
} from '@/app/api/lib/helpers/collectionReportV2/recalculation';
import type {
  ReportedMachineStatus,
  ReportedMachineDocument,
  ReportedMachineMovement,
} from '@/app/api/lib/models/reportedMachines';
import type {
  CaptureMachinePayload,
  UpdateMachinePayload,
} from '@/app/api/lib/types/collectionReportV2';

// ============================================================================
// Types
// ============================================================================

type ParsedCapturePayload = {
  sessionId: string;
  machineId: string;
  locationId: string;
  locationName: string;
  status: ReportedMachineStatus;
  metersMatch?: boolean;
  ramClear: boolean;
  ramClearIn?: number;
  ramClearOut?: number;
  sasStartTime?: Date;
  sasEndTime: Date;
};

type CaptureComputed = {
  prevMeters: { prevSasMetersIn: number; prevSasMetersOut: number };
  movement: ReportedMachineMovement;
  sasGross: number | null;
  resolvedSasMetersIn: number | null;
  resolvedSasMetersOut: number | null;
  isSupplemental?: boolean;
};

type RecalculatedFields = {
  sasMetersIn: number | null;
  sasMetersOut: number | null;
  sasGross: number | null;
  isSupplemental?: boolean;
  prevSasMetersIn: number;
  prevSasMetersOut: number;
  movement: ReportedMachineMovement;
  manualMetersIn?: number | null;
  manualMetersOut?: number | null;
};

const VALID_STATUSES: ReportedMachineStatus[] = [
  'pending',
  'captured',
  'confirmed',
  'skipped',
];

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate the incoming capture payload. Checks required fields, status, and
 * RAM clear peak requirements.
 */
export function validateCapturePayload(
  body: CaptureMachinePayload
): { data: ParsedCapturePayload } | { error: string; status: number } {
  const { sessionId, machineId, locationId, locationName, status } = body;

  if (!sessionId || !machineId || !locationId || !locationName) {
    return {
      error: 'sessionId, machineId, locationId, locationName are required',
      status: 400,
    };
  }

  if (!VALID_STATUSES.includes(status)) {
    return { error: 'Invalid status value', status: 400 };
  }

  const ramClear = body.ramClear === true;
  const ramClearIn =
    body.ramClearMetersIn !== undefined && body.ramClearMetersIn !== null
      ? Number(body.ramClearMetersIn)
      : undefined;
  const ramClearOut =
    body.ramClearMetersOut !== undefined && body.ramClearMetersOut !== null
      ? Number(body.ramClearMetersOut)
      : undefined;

  if (ramClear && (ramClearIn === undefined || ramClearOut === undefined)) {
    return {
      error:
        'ramClearMetersIn and ramClearMetersOut are required when ramClear is true',
      status: 400,
    };
  }

  return {
    data: {
      sessionId,
      machineId,
      locationId,
      locationName,
      status,
      metersMatch: body.metersMatch,
      ramClear,
      ramClearIn,
      ramClearOut,
      sasStartTime: body.sasStartTime
        ? new Date(body.sasStartTime)
        : undefined,
      sasEndTime: body.sasEndTime ? new Date(body.sasEndTime) : new Date(),
    },
  };
}

/**
 * Validate the ramClear invariant: peak values must be >= previous SAS meters.
 */
export function validateRamClearPeak(
  ramClearIn: number,
  ramClearOut: number,
  prevSasMetersIn: number,
  prevSasMetersOut: number
): { error: string; status: number } | null {
  if (ramClearIn < prevSasMetersIn || ramClearOut < prevSasMetersOut) {
    return {
      error:
        'ramClearMetersIn/Out must be greater than or equal to previous meters',
      status: 400,
    };
  }
  return null;
}

// ============================================================================
// Document Builder (POST)
// ============================================================================

/**
 * Build the full ReportedMachine document data from the validated payload and
 * computed movement values.
 */
export function buildCaptureDocumentData(
  id: string,
  parsed: ParsedCapturePayload,
  body: CaptureMachinePayload,
  userId: string,
  computed: CaptureComputed
): Omit<ReportedMachineDocument, 'createdAt' | 'updatedAt'> {
  const metersMatch = parsed.metersMatch;

  return {
    _id: id,
    sessionId: parsed.sessionId,
    sessionStatus: 'in-progress',
    locationId: parsed.locationId,
    locationName: parsed.locationName,
    licencee: body.licencee || '',
    machineId: parsed.machineId,
    machineName: body.machineName || '',
    machineCustomName: body.machineCustomName || '',
    serialNumber: body.serialNumber || '',
    manufacturer: body.manufacturer || '',
    game: body.game || '',
    collector: body.collector || userId,
    collectorName: body.collectorName || '',
    sasMetersIn: computed.resolvedSasMetersIn,
    sasMetersOut: computed.resolvedSasMetersOut,
    sasGross: computed.sasGross,
    manualMetersIn:
      body.manualMetersIn !== undefined
        ? Number(body.manualMetersIn)
        : metersMatch === true
          ? computed.resolvedSasMetersIn
          : undefined,
    manualMetersOut:
      body.manualMetersOut !== undefined
        ? Number(body.manualMetersOut)
        : metersMatch === true
          ? computed.resolvedSasMetersOut
          : undefined,
    prevSasMetersIn: computed.prevMeters.prevSasMetersIn,
    prevSasMetersOut: computed.prevMeters.prevSasMetersOut,
    movement: computed.movement,
    isSupplemental: computed.isSupplemental,
    ramClear: parsed.ramClear,
    ramClearMetersIn: parsed.ramClear ? parsed.ramClearIn : undefined,
    ramClearMetersOut: parsed.ramClear ? parsed.ramClearOut : undefined,
    sasStartTime: parsed.sasStartTime,
    sasEndTime: parsed.sasEndTime,
    metersMatch: body.metersMatch ?? undefined,
    sequenceOrder: Number(body.sequenceOrder) || 0,
    status: parsed.status,
    deletedAt: null,
    tempImageData:
      body.imageData?.startsWith('data:image/')
        ? body.imageData
        : undefined,
  };
}

// ============================================================================
// Chronological Edit Check (PATCH)
// ============================================================================

/**
 * Check whether the PATCH would create a middle-date insertion. Returns
 * null if allowed, or an error object if the edit is rejected.
 */
export async function checkChronologicalEdit(
  targetMachine: ReportedMachineDocument,
  body: UpdateMachinePayload
): Promise<{ error: string; status: number } | null> {
  const keyFields: Array<keyof UpdateMachinePayload> = [
    'sasMetersIn',
    'sasMetersOut',
    'manualMetersIn',
    'manualMetersOut',
    'ramClear',
    'ramClearMetersIn',
    'ramClearMetersOut',
    'sasStartTime',
    'sasEndTime',
  ];
  const isModifyingKeyFields = keyFields.some(
    key => body[key] !== undefined
  );

  if (!isModifyingKeyFields || !targetMachine.machineId) return null;

  const targetTime = body.sasEndTime
    ? new Date(body.sasEndTime as string)
    : targetMachine.sasEndTime || new Date();

  const nextReport = await ReportedMachine.findOne({
    machineId: targetMachine.machineId,
    sessionStatus: 'submitted',
    sessionId: { $ne: targetMachine.sessionId },
    sasEndTime: { $gt: targetTime },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean<ReportedMachineDocument>();

  if (!nextReport) return null;

  const prevReport = await ReportedMachine.findOne({
    machineId: targetMachine.machineId,
    sessionStatus: 'submitted',
    sessionId: { $ne: targetMachine.sessionId },
    sasEndTime: { $lt: targetTime },
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  }).lean<ReportedMachineDocument>();

  if (prevReport) {
    return {
      error:
        'Chronological check failed: cannot edit into a middle-date report. A more recent collection session has already been submitted for this machine. To make changes, you must revert or delete the newer session(s) first.',
      status: 400,
    };
  }

  return null;
}

// ============================================================================
// Update Data Builder (PATCH)
// ============================================================================

/**
 * Build the updateData and unsetData objects from the PATCH body.
 * Does NOT handle image or movement recalc — those are applied separately.
 */
export function buildUpdateDataFromPayload(
  body: UpdateMachinePayload
): {
  updateData: Partial<ReportedMachineDocument>;
  unsetData: Record<string, 1>;
} {
  const updateData: Partial<ReportedMachineDocument> = {};
  if (body.sasStartTime) updateData.sasStartTime = new Date(body.sasStartTime);
  if (body.sasEndTime) updateData.sasEndTime = new Date(body.sasEndTime);
  if (body.imageCapturedAt) updateData.imageCapturedAt = new Date(body.imageCapturedAt);

  if (body.status !== undefined) updateData.status = body.status;
  if (body.sasMetersIn !== undefined) updateData.sasMetersIn = body.sasMetersIn;
  if (body.sasMetersOut !== undefined) updateData.sasMetersOut = body.sasMetersOut;
  if (body.manualMetersIn !== undefined) updateData.manualMetersIn = body.manualMetersIn;
  if (body.manualMetersOut !== undefined) updateData.manualMetersOut = body.manualMetersOut;
  if (body.metersMatch !== undefined) updateData.metersMatch = body.metersMatch;
  if (body.notes !== undefined) updateData.notes = body.notes;

  const unsetData: Record<string, 1> = {};
  if (body.ramClear !== undefined) {
    updateData.ramClear = body.ramClear;
    if (body.ramClear === false) {
      unsetData.ramClearMetersIn = 1;
      unsetData.ramClearMetersOut = 1;
    }
  }
  if (body.ramClearMetersIn !== undefined && body.ramClearMetersIn !== null) {
    updateData.ramClearMetersIn = Number(body.ramClearMetersIn);
  }
  if (body.ramClearMetersOut !== undefined && body.ramClearMetersOut !== null) {
    updateData.ramClearMetersOut = Number(body.ramClearMetersOut);
  }

  return { updateData, unsetData };
}

// ============================================================================
// No-Relay SAS Enforcement
// ============================================================================

/**
 * For machines without a relayId, force all SAS fields to null so they never
 * leak into SAS columns on the frontend.
 */
export async function enforceNoRelayNullSas(
  machineId: string,
  updateData: Partial<ReportedMachineDocument>
): Promise<void> {
  if (!machineId) return;

  const { Machine: MachineModel } = await import(
    '@/app/api/lib/models/machines'
  );
  const machineDoc = await MachineModel.findOne(
    { _id: machineId },
    'relayId'
  ).lean<{ relayId?: string | null }>();

  if (!machineDoc?.relayId) {
    updateData.sasMetersIn = null;
    updateData.sasMetersOut = null;
    updateData.sasGross = null;
  }
}

// ============================================================================
// Image Handler
// ============================================================================

/**
 * Handle removeImage flag (delete existing Drive file, clear temp data) and
 * new imageData (store base64 temporarily).
 * Mutates updateData in place.
 */
export async function handleImageUpdates(
  reportedMachineId: string,
  body: UpdateMachinePayload,
  updateData: Partial<ReportedMachineDocument>,
  removeImage: boolean
): Promise<void> {
  if (removeImage) {
    const existing = await ReportedMachine.findOne(
      { _id: reportedMachineId },
      'driveFileId'
    ).lean<ReportedMachineDocument>();

    const oldDriveFileId = existing?.driveFileId;
    if (oldDriveFileId) {
      await deleteDriveFile(oldDriveFileId).catch(deleteError => {
        console.error(
          '[machineOperations] Failed to delete Drive file on remove:',
          deleteError
        );
      });
      updateData.driveFileId = null;
      (updateData as Record<string, unknown>).driveFolderId = null;
    }
    updateData.tempImageData = undefined;
    return;
  }

  if (body.imageData?.startsWith('data:image/')) {
    updateData.tempImageData = body.imageData;
  }
}

// ============================================================================
// Movement Recalculation
// ============================================================================

/**
 * Resolve merged (body + stored) field values and recompute movement.
 * Returns the recalculated fields or an error.
 */
export async function resolveAndRecalculateMovement(
  reportedMachineId: string,
  body: UpdateMachinePayload,
  updateData: Partial<ReportedMachineDocument>
): Promise<{ data: RecalculatedFields } | { error: string; status: number }> {
  const currentDoc = await ReportedMachine.findOne(
    { _id: reportedMachineId },
    'machineId sessionId sasMetersIn sasMetersOut manualMetersIn manualMetersOut metersMatch sasStartTime sasEndTime ramClear ramClearMetersIn ramClearMetersOut'
  ).lean<{
    machineId: string;
    sessionId: string;
    sasMetersIn: number;
    sasMetersOut: number;
    manualMetersIn?: number;
    manualMetersOut?: number;
    metersMatch?: boolean;
    sasStartTime?: Date;
    sasEndTime?: Date;
    ramClear?: boolean;
    ramClearMetersIn?: number;
    ramClearMetersOut?: number;
  }>();

  if (!currentDoc) return { error: 'Machine capture not found', status: 404 };

  const resolvedSasIn =
    updateData.sasMetersIn !== undefined
      ? updateData.sasMetersIn
      : currentDoc.sasMetersIn;
  const resolvedSasOut =
    updateData.sasMetersOut !== undefined
      ? updateData.sasMetersOut
      : currentDoc.sasMetersOut;
  const resolvedMetersMatch =
    updateData.metersMatch ?? currentDoc.metersMatch;
  const resolvedManualIn =
    updateData.manualMetersIn !== undefined
      ? updateData.manualMetersIn
      : resolvedMetersMatch === true && resolvedSasIn !== null
        ? resolvedSasIn
        : (currentDoc.manualMetersIn ?? undefined);
  const resolvedManualOut =
    updateData.manualMetersOut !== undefined
      ? updateData.manualMetersOut
      : resolvedMetersMatch === true && resolvedSasOut !== null
        ? resolvedSasOut
        : (currentDoc.manualMetersOut ?? undefined);
  const resolvedSasStart =
    updateData.sasStartTime ?? currentDoc.sasStartTime;
  const resolvedSasEnd = updateData.sasEndTime ?? currentDoc.sasEndTime;

  const resolvedRamClear =
    body.ramClear !== undefined
      ? body.ramClear
      : (currentDoc.ramClear ?? false);
  const resolvedRamClearIn = resolvedRamClear
    ? (updateData.ramClearMetersIn ?? currentDoc.ramClearMetersIn)
    : undefined;
  const resolvedRamClearOut = resolvedRamClear
    ? (updateData.ramClearMetersOut ?? currentDoc.ramClearMetersOut)
    : undefined;

  const {
    prevMeters,
    movement,
    sasGross,
    resolvedSasMetersIn,
    resolvedSasMetersOut,
    isSupplemental,
  } = await computeMovement(
    currentDoc.machineId,
    currentDoc.sessionId,
    resolvedSasIn ?? 0,
    resolvedSasOut ?? 0,
    resolvedManualIn ?? undefined,
    resolvedManualOut ?? undefined,
    resolvedMetersMatch,
    resolvedSasStart,
    resolvedSasEnd,
    resolvedRamClear,
    resolvedRamClearIn,
    resolvedRamClearOut
  );

  if (
    resolvedRamClear &&
    resolvedRamClearIn !== undefined &&
    resolvedRamClearOut !== undefined
  ) {
    const peakError = validateRamClearPeak(
      resolvedRamClearIn,
      resolvedRamClearOut,
      prevMeters.prevSasMetersIn,
      prevMeters.prevSasMetersOut
    );
    if (peakError) return peakError;
  }

  return {
    data: {
      sasMetersIn: resolvedSasMetersIn,
      sasMetersOut: resolvedSasMetersOut,
      sasGross,
      isSupplemental,
      prevSasMetersIn: prevMeters.prevSasMetersIn,
      prevSasMetersOut: prevMeters.prevSasMetersOut,
      movement,
      manualMetersIn:
        resolvedMetersMatch === true && resolvedSasMetersIn !== null
          ? resolvedSasMetersIn
          : updateData.manualMetersIn,
      manualMetersOut:
        resolvedMetersMatch === true && resolvedSasMetersOut !== null
          ? resolvedSasMetersOut
          : updateData.manualMetersOut,
    },
  };
}

/**
 * Determine whether movement needs recalculation based on the body fields.
 */
export function shouldRecalculateMovement(
  body: UpdateMachinePayload
): boolean {
  return (
    body.status === 'confirmed' ||
    body.status === 'captured' ||
    body.sasMetersIn !== undefined ||
    body.sasMetersOut !== undefined ||
    body.manualMetersIn !== undefined ||
    body.manualMetersOut !== undefined ||
    body.metersMatch !== undefined ||
    body.ramClear !== undefined ||
    body.ramClearMetersIn !== undefined ||
    body.ramClearMetersOut !== undefined
  );
}

// ============================================================================
// Mongo Update Apply
// ============================================================================

/**
 * Apply $set / $unset to the ReportedMachine document. Handles the legacy
 * ObjectId fallback for documents created with insertMany + _id: undefined.
 */
export async function applyMongoUpdate(
  reportedMachineId: string,
  updateData: Partial<ReportedMachineDocument>,
  unsetData: Record<string, 1>
): Promise<ReportedMachineDocument | null> {
  const updateOps: Record<string, unknown> = {};
  if (Object.keys(updateData).length > 0) updateOps.$set = updateData;
  if (Object.keys(unsetData).length > 0) updateOps.$unset = unsetData;

  let result = await ReportedMachine.findOneAndUpdate(
    { _id: reportedMachineId },
    updateOps,
    { new: true }
  ).lean<ReportedMachineDocument>();

  // Legacy fallback: documents created with insertMany + _id: undefined
  // may have ObjectId _id instead of string. Try native query.
  if (!result) {
    const mongoose = (await import('mongoose')).default;
    if (mongoose.Types.ObjectId.isValid(reportedMachineId)) {
      const nativeResult = await ReportedMachine.collection.findOneAndUpdate(
        { _id: new mongoose.Types.ObjectId(reportedMachineId) },
        updateOps,
        { returnDocument: 'after' }
      );
      if (nativeResult) {
        result = JSON.parse(JSON.stringify(nativeResult));
      }
    }
  }

  return result;
}

// ============================================================================
// Post-Submit Cascade
// ============================================================================

/**
 * Fire-and-forget cascade to Machine + Meters + propagation when a submitted
 * session machine is edited. Errors are logged but not returned.
 */
export function handlePostSubmitCascade(
  result: ReportedMachineDocument,
  functionName: string
): void {
  cascadeMachineEdit({
    machineId: result.machineId,
    sessionId: result.sessionId,
    locationId: result.locationId,
    locationName: result.locationName,
    sasEndTime: result.sasEndTime,
    manualMetersIn: result.manualMetersIn,
    manualMetersOut: result.manualMetersOut,
    sasMetersIn: result.sasMetersIn,
    sasMetersOut: result.sasMetersOut,
    prevSasMetersIn: result.prevSasMetersIn,
    prevSasMetersOut: result.prevSasMetersOut,
    ramClear: result.ramClear,
    ramClearMetersIn: result.ramClearMetersIn,
    ramClearMetersOut: result.ramClearMetersOut,
  }).catch(cascadeErr => {
    console.error(`[${functionName}] Cascade failed:`, cascadeErr);
  });

  propagateV2MetersToNextSession(
    result.machineId,
    result.sessionId,
    result.manualMetersIn ?? result.sasMetersIn,
    result.manualMetersOut ?? result.sasMetersOut,
    result.sasEndTime
  ).catch(propErr => {
    console.error(`[${functionName}] Propagation failed:`, propErr);
  });
}

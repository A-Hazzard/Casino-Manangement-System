/**
 * @module app/api/lib/helpers/collectionReport/smibMeterFix
 *
 * - Recalculates the movement values on the SMIB meter that follows a
 *   supplemental (offline) meter after the supplemental is deleted.
 */

import { Meters } from '../../models/meters';
import type { MeterDocument } from '@/shared/types';

// ============================================================================
// Active meter filter (excludes soft-deleted docs)
// ============================================================================

const ACTIVE_METER_FILTER = {
  $or: [
    { deletedAt: null },
    { deletedAt: { $exists: false } },
    { deletedAt: { $lt: new Date('2025-01-01') } },
  ],
};

// ============================================================================
// Public helper
// ============================================================================

/**
 * When a CR for an offline SMIB machine is deleted, the supplemental meters
 * created for the offline period are removed. But the SMIB meter pushed right
 * after the supplemental has movement.drop = 0 — because the SMIB calculated
 * it as (current.drop − supplemental.drop), and both hold the same lifetime
 * counter value (nothing happened during the offline restart).
 *
 * After deletion we absorb the full activity from the pre-offline meter
 * (meter_A) through to the SMIB meter (meter_B):
 *
 *   meter_B.movement.drop                  = meter_B.drop − meter_A.drop
 *   meter_B.movement.totalCancelledCredits = meter_B.tCC  − meter_A.tCC
 *   meter_B.movement.gross                 = drop         − totalCancelledCredits
 *
 * @param machineId               The machine whose meters to fix.
 * @param latestSupplementalReadAt  readAt of the last supplemental meter in the
 *                                  offline window (the post-reset meter for RAM
 *                                  clears; otherwise the single supplemental).
 * @param earliestSupplementalReadAt  readAt of the first supplemental in the
 *                                    window (the RAM clear meter, or same as
 *                                    latestSupplementalReadAt otherwise).
 */
export async function fixSmibMeterAfterSupplementalDeletion(
  machineId: string,
  latestSupplementalReadAt: Date,
  earliestSupplementalReadAt: Date
): Promise<void> {
  if (!machineId) {
    console.error('[fixSmibMeterAfterSupplementalDeletion] machineId is required');
    return;
  }

  // meter_A: last non-supplemental meter before the offline window
  const meterA = await Meters.findOne({
    machine: machineId,
    readAt: { $lt: earliestSupplementalReadAt },
    isSupplemental: { $ne: true },
    ...ACTIVE_METER_FILTER,
  })
    .sort({ readAt: -1 })
    .lean<MeterDocument>();

  // meter_B: first SMIB meter after the offline window.
  // SMIB meters have no meterSource; manual/CR meters are 'COLLECTION_REPORT'.
  // We exclude supplemental and any other CR-created meter so we only touch
  // genuine SMIB readings.
  const meterB = await Meters.findOne({
    machine: machineId,
    readAt: { $gt: latestSupplementalReadAt },
    isSupplemental: { $ne: true },
    meterSource: { $ne: 'COLLECTION_REPORT' },
    ...ACTIVE_METER_FILTER,
  })
    .sort({ readAt: 1 })
    .lean<MeterDocument>();

  if (!meterB) {
    console.log(
      `[fixSmibMeterAfterSupplementalDeletion] No SMIB meter found after supplemental for machine ${machineId} — machine may still be offline`
    );
    return;
  }

  if (!meterA) {
    console.log(
      `[fixSmibMeterAfterSupplementalDeletion] No pre-offline meter found for machine ${machineId} — cannot recalculate movement`
    );
    return;
  }

  const fixedDrop = (meterB.drop ?? 0) - (meterA.drop ?? 0);
  const fixedOut =
    (meterB.totalCancelledCredits ?? 0) - (meterA.totalCancelledCredits ?? 0);
  const fixedGross = fixedDrop - fixedOut;

  await Meters.updateOne(
    { _id: meterB._id },
    {
      $set: {
        'movement.drop': fixedDrop,
        'movement.totalCancelledCredits': fixedOut,
        'movement.gross': fixedGross,
      },
    }
  );

  console.log(
    `[fixSmibMeterAfterSupplementalDeletion] Fixed meter_B ${meterB._id} for machine ${machineId}: ` +
      `movement.drop=${fixedDrop}, movement.totalCancelledCredits=${fixedOut}, movement.gross=${fixedGross}`
  );
}

/**
 * @module app/api/lib/helpers/collectionReport/deletionPropagation
 *
 * - Propagates a CR deletion forward to the successor collection and
 *   recalculates machine meter state.
 */

import { Collections } from '../../models/collections';
import { recalculateMachineCollections } from './recalculation';
import type { CollectionDocument } from '@/lib/types/collection';

// ============================================================================
// Public helper
// ============================================================================

/**
 * After a collection report is deleted, each machine's next chronological
 * collection must have its prevIn/prevOut stitched to the deleted report's
 * own prevIn/prevOut so the movement chain stays intact.
 *
 * Also re-syncs each machine's collectionMeters from the database.
 */
export async function propagateCRDeletionForward(
  associatedCollections: CollectionDocument[]
): Promise<void> {
  const { updateRegularAndRamClearMeters } = await import('./reportCreation');

  await Promise.all(
    associatedCollections.map(async col => {
      if (!col.machineId) return;

      try {
        const nextReport = await Collections.findOne({
          machineId: col.machineId,
          timestamp: { $gt: col.timestamp || col.collectionTime || new Date() },
          deletedAt: { $exists: false },
        })
          .sort({ timestamp: 1 })
          .lean<CollectionDocument>();

        if (nextReport) {
          console.log(
            `[propagateCRDeletionForward] Machine ${col.machineId}: stitching successor ${nextReport._id} prevMeters → prevIn=${col.prevIn}, prevOut=${col.prevOut}`
          );

          const newPrevIn = col.prevIn || 0;
          const newPrevOut = col.prevOut || 0;
          const currentMetersIn = nextReport.metersIn ?? 0;
          const currentMetersOut = nextReport.metersOut ?? 0;
          const ramClear = !!nextReport.ramClear;
          const ramClearMetersIn = nextReport.ramClearMetersIn;
          const ramClearMetersOut = nextReport.ramClearMetersOut;

          let movementIn = 0;
          let movementOut = 0;

          if (ramClear) {
            if (ramClearMetersIn !== undefined && ramClearMetersOut !== undefined) {
              movementIn = ramClearMetersIn - newPrevIn + currentMetersIn;
              movementOut = ramClearMetersOut - newPrevOut + currentMetersOut;
            } else {
              movementIn = currentMetersIn;
              movementOut = currentMetersOut;
            }
          } else {
            movementIn = currentMetersIn - newPrevIn;
            movementOut = currentMetersOut - newPrevOut;
          }

          const movement = {
            metersIn: Number(movementIn.toFixed(2)),
            metersOut: Number(movementOut.toFixed(2)),
            gross: Number((movementIn - movementOut).toFixed(2)),
          };

          const collectionUpdate: Record<string, unknown> = {
            prevIn: newPrevIn,
            prevOut: newPrevOut,
            movement,
            softMetersIn:
              ramClear && ramClearMetersIn ? ramClearMetersIn : currentMetersIn,
            softMetersOut:
              ramClear && ramClearMetersOut ? ramClearMetersOut : currentMetersOut,
          };

          if (nextReport.sasMeters) {
            collectionUpdate.sasMeters = {
              ...nextReport.sasMeters,
              drop: movement.metersIn,
              totalCancelledCredits: movement.metersOut,
              gross: movement.gross,
            };
          }

          await Collections.updateOne(
            { _id: nextReport._id },
            { $set: collectionUpdate }
          );

          await updateRegularAndRamClearMeters({
            ...nextReport,
            ...collectionUpdate,
          } as CollectionDocument);
        }

        await recalculateMachineCollections(String(col.machineId), true);
      } catch (machineError) {
        console.error(
          `[propagateCRDeletionForward] Failed for machine ${col.machineId}:`,
          machineError instanceof Error ? machineError.message : 'Unknown error'
        );
      }
    })
  );
}

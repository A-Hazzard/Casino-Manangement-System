/**
 * WOW Auto Report — direct collection persistence.
 *
 * Used by {@link useWowAutoReport} to add a WOW machine's collection straight to the
 * database (POST /api/collection-reports/collections) without driving the heavy per-machine
 * form UI. Mirrors the payload built by the manual add handlers; prev meters come from the
 * WOW sync (passed in), not the backend.
 *
 * @module lib/helpers/collectionReport/wowAutoReportPersist
 */

import type {
  WowAutoReportMachine,
  WowAutoReportMeters,
} from '@/lib/hooks/collectionReport/useWowAutoReport';
import type { CollectionDocument } from '@/lib/types/collection';

export type WowPersistContext = {
  locationId: string;
  /** Existing report id (edit flow). Omitted for the create flow (draft collection). */
  locationReportId?: string;
  collector: string;
  /**
   * Legacy field kept for caller compatibility. SAS end time is now always taken from
   * `meters.currentReadAt` so it aligns with `metersIn`.
   */
  collectionTime?: Date;
  /**
   * Legacy field kept for caller compatibility. Meter readAt timestamps are always used
   * directly for SAS window boundaries.
   */
  useMeterTimes?: boolean;
  /** Fallback period start when the batch baseline timestamp is unavailable. */
  previousCollectionTime?: Date;
  machineName?: string;
  serialNumber?: string;
  machineCustomName?: string;
  /**
   * Legacy field kept for caller compatibility. Gaming-day alignment is no longer applied
   * to WOW SAS windows.
   */
  gameDayOffset?: number;
};

/**
 * Persists one WOW collection and returns the local CollectionDocument to append, or null
 * on failure.
 */
export async function persistWowCollection(
  machine: WowAutoReportMachine,
  meters: WowAutoReportMeters,
  ctx: WowPersistContext
): Promise<CollectionDocument | null> {
  // The period is [baseline → end]: sasStartTime is the timestamp the prevIn reading
  // came from (so editing the entry later re-derives the same prev), sasEndTime is the
  // timestamp the metersIn reading came from. These must not be identical, otherwise a
  // later edit re-queries with start == end and prevIn collapses to metersIn.
  //
  // CRITICAL: always use the actual synced meter readAt times for both boundaries.
  // metersIn/prevIn come from those exact readings, so the SAS window must cover the
  // same interval for Machine Gross and SAS Gross to reconcile. Aligning to gaming-day
  // boundaries here breaks that alignment and produces variation.
  let sasStartTime: Date | null = null;
  let sasEndTime: Date | null = null;

  sasEndTime = meters.currentReadAt ? new Date(meters.currentReadAt) : new Date();
  sasStartTime = meters.baselineAt ? new Date(meters.baselineAt) : null;

  // If no baseline meter exists (first report / never synced), fall back to the
  // previous collection time or 24 hours before the found meter so the entry has
  // a defined period. When baseline == current (stale machine with no newer data),
  // keep the zero-width window — expanding it would make SAS gross reflect old
  // activity while Machine Gross stays 0, producing bogus variation.
  if (!sasStartTime) {
    sasStartTime = ctx.previousCollectionTime
      ? new Date(ctx.previousCollectionTime)
      : new Date(sasEndTime.getTime() - 24 * 60 * 60 * 1000);
  }

  const payload = {
    machineId: machine.id,
    machineName: ctx.machineName || '',
    serialNumber: ctx.serialNumber || '',
    machineCustomName: ctx.machineCustomName || '',
    metersIn: meters.metersIn,
    metersOut: meters.metersOut,
    prevIn: meters.prevIn,
    prevOut: meters.prevOut,
    notes: '',
    ramClear: false,
    timestamp: sasEndTime,
    collectionTime: sasEndTime,
    location: ctx.locationId,
    ...(ctx.locationReportId
      ? { locationReportId: ctx.locationReportId }
      : {}),
    collector: ctx.collector,
    sasStartTime,
    sasEndTime,
  };

  const res = await fetch('/api/collection-reports/collections', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => null);
  const savedId = json?.data?._id;
  if (!res.ok || !savedId) return null;

  const movementIn = meters.metersIn - meters.prevIn;
  const movementOut = meters.metersOut - meters.prevOut;

  return {
    ...payload,
    _id: savedId,
    isCompleted: false,
    softMetersIn: 0,
    softMetersOut: 0,
    sasMeters: {
      machine: machine.id,
      drop: 0,
      totalCancelledCredits: 0,
      gross: 0,
      gamesPlayed: 0,
      jackpot: 0,
      sasStartTime,
      sasEndTime,
    },
    movement: {
      metersIn: movementIn,
      metersOut: movementOut,
      gross: movementIn - movementOut,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    __v: 0,
  } as unknown as CollectionDocument;
}

/**
 * WOW (Wheel of Wonders) machine detection.
 *
 * WOW machines are roulette machines synced from an external "wow" source. They are
 * identified by `meta.dataSync.source === 'wow'`. They require distinct handling across
 * collection reports (no manual meter creation, read-only synced meters), online status
 * (always online), and location/cabinet displays.
 *
 * @module shared/utils/wowMachine
 */

export const WOW_SOURCE = 'wow';

export type WowMachineLike = {
  meta?: { dataSync?: { source?: string } | null } | null;
} | null;

/**
 * Returns true when the machine originates from the WOW sync source.
 */
export const isWowMachine = (machine?: WowMachineLike): boolean =>
  machine?.meta?.dataSync?.source === WOW_SOURCE;

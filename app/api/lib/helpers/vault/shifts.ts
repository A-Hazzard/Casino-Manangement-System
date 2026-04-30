/**
 * Shift Helper Functions
 *
 * This file contains helper functions for shift operations.
 * It supports:
 * - Getting shift by ID
 * - Transforming shift for API response
 *
 * @module app/api/lib/helpers/vault/shifts
 */

import { Shift } from '@/app/api/lib/models/shifts';
import { type ShiftDocument } from '@/shared/types/models';

/**
 * Get shift by ID
 * @param {string} id - Shift ID
 * @returns {Promise<ShiftDocument | null>} Shift document or null
 */
export async function getShiftById(
  id: string
): Promise<ShiftDocument | null> {
  if (!id) {
    console.error('[getShiftById] id is required');
    return null;
  }
  return await Shift.findOne({ _id: id }).lean<ShiftDocument>();
}

/**
 * Transform shift for API response
 * @param {ShiftDocument} shift - Shift document
 * @returns {Record<string, unknown>} Transformed shift object
 */
export function transformShiftForResponse(
  shift: ShiftDocument
): Record<string, unknown> {
  if (!shift) {
    console.error('[transformShiftForResponse] shift is required');
    return {};
  }
  return {
    _id: shift._id,
    role: shift.role,
    userName: shift.userName,
    userId: shift.userId,
    startDenom: shift.startDenom,
    endDenom: shift.endDenom,
    startedShiftAt: shift.startedShiftAt,
    closedShiftAt: shift.closedShiftAt,
    location: shift.location,
    locationId: shift.locationId,
    status: shift.status,
    notes: shift.notes,
    createdAt: shift.createdAt,
    updatedAt: shift.updatedAt,
  };
}

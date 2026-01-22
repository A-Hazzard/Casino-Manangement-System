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
import type { ShiftDocument } from '@/app/api/lib/types/vault';

/**
 * Get shift by ID
 * @param id - Shift ID
 * @returns Shift document or null
 */
export async function getShiftById(
  id: string
): Promise<ShiftDocument | null> {
  const shift = await Shift.findOne({ _id: id }).lean();
  return shift as unknown as ShiftDocument | null;
}

/**
 * Transform shift for API response
 * @param shift - Shift document
 * @returns Transformed shift object
 */
export function transformShiftForResponse(
  shift: ShiftDocument
): Record<string, unknown> {
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

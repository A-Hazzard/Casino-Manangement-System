/**
 * Licensee Management Helper Functions
 *
 * Provides helper functions for managing licensee data, including CRUD operations
 * and data formatting for frontend consumption. It handles licensee creation, updates,
 * soft deletion, and ensures consistent data formatting with proper isPaid status calculation.
 *
 * Features:
 * - Formats licensee data for frontend consumption with proper isPaid status.
 * - Retrieves all licensees from the database with filtering.
 * - Creates new licensees with unique license keys and activity logging.
 * - Updates existing licensees with change tracking (prevStartDate, prevExpiryDate).
 * - Soft deletes licensees with activity logging.
 * - Fetches licensees for frontend consumption.
 */

import { generateMongoId } from '@/lib/utils/id';
import { Licencee } from '../../app/api/lib/models/licencee';
import { generateUniqueLicenseKey } from '../utils/licenseKey';

// ============================================================================
// Licensee Data Formatting
// ============================================================================

/**
 * Formats licensees data for frontend consumption, ensuring isPaid status is always defined
 */
export function formatLicenseesForResponse(
  licensees: Record<string, unknown>[]
) {
  return licensees.map(licensee => {
    let isPaid = licensee.isPaid;
    if (typeof isPaid === 'undefined') {
      if (licensee.expiryDate) {
        isPaid = new Date(licensee.expiryDate as string | Date) > new Date();
      } else {
        isPaid = false;
      }
    }
    return {
      ...licensee,
      isPaid,
      countryName: licensee.country,
      lastEdited: licensee.updatedAt,
    };
  });
}

// ============================================================================
// Licensee Data Retrieval
// ============================================================================

/**
 * Retrieves all licensees from database
 */
export async function getAllLicensees() {
  return await Licencee.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    },
    {
      _id: 1,
      name: 1,
      description: 1,
      country: 1,
      startDate: 1,
      expiryDate: 1,
      createdAt: 1,
      updatedAt: 1,
      geoCoords: 1,
      isPaid: 1,
      prevStartDate: 1,
      prevExpiryDate: 1,
    }
  )
    .sort({ name: 1 })
    .lean();
}

// ============================================================================
// Licensee CRUD Operations
// ============================================================================

/**
 * Creates a new licensee with activity logging
 */
export async function createLicensee(data: {
  name: string;
  description?: string;
  country: string;
  startDate?: string;
  expiryDate?: string;
}) {
  const { name, description, country, startDate, expiryDate } = data;
  const newId = await generateMongoId();
  const licenseKey = await generateUniqueLicenseKey();

  const finalStartDate = startDate ? new Date(startDate) : new Date();
  let finalExpiryDate = null;
  if (expiryDate) {
    finalExpiryDate = new Date(expiryDate);
  } else {
    finalExpiryDate = new Date(finalStartDate);
    finalExpiryDate.setDate(finalExpiryDate.getDate() + 30);
  }

  const licensee = await Licencee.create({
    _id: newId,
    name,
    description: description || '',
    country,
    startDate: finalStartDate,
    expiryDate: finalExpiryDate,
    licenseKey,
    lastEdited: new Date(),
  });

  // Activity logging removed - server-side context not available in client helpers

  return licensee;
}

/**
 * Updates an existing licensee with activity logging
 */
export async function updateLicensee(data: {
  _id: string;
  name?: string;
  description?: string;
  country?: string;
  startDate?: string;
  expiryDate?: string;
  isPaid?: boolean;
  prevStartDate?: string;
  prevExpiryDate?: string;
}) {
  const {
    _id,
    name,
    description,
    country,
    startDate,
    expiryDate,
    isPaid,
    prevStartDate,
    prevExpiryDate,
  } = data;

  const originalLicensee = (await Licencee.findOne({ _id }).lean()) as {
    _id: string;
    name: string;
    description?: string;
    country: string;
    startDate?: Date;
    expiryDate?: Date;
    prevStartDate?: Date;
    prevExpiryDate?: Date;
    isPaid?: boolean;
    licenseKey?: string;
  } | null;

  if (!originalLicensee) {
    throw new Error('Licensee not found');
  }

  const updateData: Record<string, unknown> = { lastEdited: new Date() };

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (country !== undefined) updateData.country = country;
  if (startDate !== undefined) {
    if (
      originalLicensee.startDate &&
      startDate !== originalLicensee.startDate.toISOString()
    ) {
      updateData.prevStartDate = originalLicensee.startDate;
    }
    updateData.startDate = startDate ? new Date(startDate) : null;
  }
  if (expiryDate !== undefined) {
    if (
      originalLicensee.expiryDate &&
      expiryDate !== originalLicensee.expiryDate.toISOString()
    ) {
      updateData.prevExpiryDate = originalLicensee.expiryDate;
    }
    updateData.expiryDate = expiryDate ? new Date(expiryDate) : null;
  }
  if (prevStartDate !== undefined) {
    updateData.prevStartDate = prevStartDate ? new Date(prevStartDate) : null;
  }
  if (prevExpiryDate !== undefined) {
    updateData.prevExpiryDate = prevExpiryDate
      ? new Date(prevExpiryDate)
      : null;
  }
  if (isPaid !== undefined) {
    updateData.isPaid = isPaid;
  }

  const updated = await Licencee.findOneAndUpdate({ _id }, updateData, {
    new: true,
  });

  if (!updated) {
    throw new Error('Licensee not found');
  }

  const updatedLicensee = updated.toObject();
  if (typeof updatedLicensee.isPaid === 'undefined') {
    if (updatedLicensee.expiryDate) {
      updatedLicensee.isPaid =
        new Date(updatedLicensee.expiryDate) > new Date();
    } else {
      updatedLicensee.isPaid = false;
    }
  }

  // Activity logging removed - server-side context not available in client helpers

  return updatedLicensee;
}

/**
 * Soft deletes a licensee with activity logging
 */
export async function deleteLicensee(_id: string) {
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const licenseeToDelete = await Licencee.findOne({ _id });

  if (!licenseeToDelete) {
    throw new Error('Licensee not found');
  }

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  const deleted = await Licencee.findOneAndUpdate(
    { _id },
    { deletedAt: new Date() },
    { new: true }
  );

  if (!deleted) {
    throw new Error('Licensee not found');
  }

  // Activity logging removed - server-side context not available in client helpers

  return deleted;
}

/**
 * Fetches all licensees for frontend consumption
 */
export async function fetchLicensees() {
  try {
    const licensees = await Licencee.find({
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    }).sort({ name: 1 });

    return licensees.map(licencee => ({
      _id: licencee._id,
      name: licencee.name,
      description: licencee.description,
      country: licencee.country,
      startDate: licencee.startDate,
      expiryDate: licencee.expiryDate,
      isPaid: licencee.isPaid,
      geoCoords: licencee.geoCoords,
      createdAt: licencee.createdAt,
      updatedAt: licencee.updatedAt,
    }));
  } catch (error) {
    console.error('Error fetching licensees:', error);
    return [];
  }
}

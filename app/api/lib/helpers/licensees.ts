import { NextRequest } from 'next/server';
import { Licencee } from '../models/licencee';
import { Countries } from '../models/countries';
import { logActivity, calculateChanges } from './activityLogger';
import { getUserFromServer } from './users';
import { getClientIP } from '@/lib/utils/ipAddress';
import { generateUniqueLicenseKey } from '../utils/licenseKey';
import { generateMongoId } from '@/lib/utils/id';

/**
 * Formats licensees data for frontend consumption, ensuring isPaid status is always defined
 */
export async function formatLicenseesForResponse(
  licensees: Record<string, unknown>[]
) {
  const countryIds = Array.from(
    new Set(
      licensees
        .map(licensee =>
          typeof licensee.country === 'string' && licensee.country.trim() !== ''
            ? (licensee.country as string)
            : null
        )
        .filter((id): id is string => Boolean(id))
    )
  );

  const countryNameMap = new Map<string, string>();

  if (countryIds.length > 0) {
    const countries = await Countries.find(
      { _id: { $in: countryIds } },
      { _id: 1, name: 1 }
    ).lean();

    countries.forEach(country => {
      countryNameMap.set(country._id as string, country.name as string);
    });
  }

  return licensees.map(licensee => {
    let isPaid = licensee.isPaid;
    if (typeof isPaid === 'undefined') {
      if (licensee.expiryDate) {
        isPaid = new Date(licensee.expiryDate as string | Date) > new Date();
      } else {
        isPaid = false;
      }
    }

    const rawCountry = licensee.country;
    const country =
      typeof rawCountry === 'string'
        ? rawCountry
        : rawCountry && typeof (rawCountry as { toString: () => string }).toString === 'function'
          ? (rawCountry as { toString: () => string }).toString()
          : '';
    const countryName = countryNameMap.get(country) || country || undefined;

    return {
      ...licensee,
      isPaid,
      country,
      countryName,
      lastEdited: licensee.updatedAt,
    };
  });
}

/**
 * Retrieves all licensees from database
 */
export async function getAllLicensees() {
  return await Licencee.find(
    {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2020-01-01') } },
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

/**
 * Creates a new licensee with activity logging
 */
export async function createLicensee(
  data: {
    name: string;
    description?: string;
    country: string;
    startDate?: string;
    expiryDate?: string;
  },
  request: NextRequest
) {
  const { name, description, country, startDate, expiryDate } = data;
  const currentUser = await getUserFromServer();
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

  if (currentUser && currentUser.emailAddress) {
    try {
      const createChanges = [
        { field: 'name', oldValue: null, newValue: name },
        { field: 'description', oldValue: null, newValue: description || '' },
        { field: 'country', oldValue: null, newValue: country },
        { field: 'licenseKey', oldValue: null, newValue: licenseKey },
        { field: 'startDate', oldValue: null, newValue: finalStartDate },
        { field: 'expiryDate', oldValue: null, newValue: finalExpiryDate },
        {
          field: 'isPaid',
          oldValue: null,
          newValue: finalExpiryDate ? finalExpiryDate > new Date() : false,
        },
      ];

      await logActivity({
        action: 'CREATE',
        details: `Created new licensee "${name}" in ${country}`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'licensee',
          resourceId: newId,
          resourceName: name,
          changes: createChanges,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  const [formattedLicensee] = await formatLicenseesForResponse([
    licensee.toObject(),
  ]);

  return formattedLicensee;
}

/**
 * Updates an existing licensee with activity logging
 */
export async function updateLicensee(
  data: {
    _id: string;
    name?: string;
    description?: string;
    country?: string;
    startDate?: string;
    expiryDate?: string;
    isPaid?: boolean;
    prevStartDate?: string;
    prevExpiryDate?: string;
  },
  request: NextRequest
) {
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

  const currentUser = await getUserFromServer();
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

  if (currentUser && currentUser.emailAddress) {
    try {
      const oldIsPaid =
        typeof originalLicensee.isPaid === 'undefined'
          ? false
          : originalLicensee.isPaid;
      const newIsPaid =
        typeof updateData.isPaid === 'undefined'
          ? oldIsPaid
          : updateData.isPaid;

      const changes = calculateChanges(
        {
          name: originalLicensee.name,
          description: originalLicensee.description,
          country: originalLicensee.country,
          startDate: originalLicensee.startDate,
          expiryDate: originalLicensee.expiryDate,
          prevStartDate: originalLicensee.prevStartDate,
          prevExpiryDate: originalLicensee.prevExpiryDate,
          isPaid: oldIsPaid,
        },
        {
          name: updateData.name || originalLicensee.name,
          description:
            updateData.description !== undefined
              ? updateData.description
              : originalLicensee.description,
          country: updateData.country || originalLicensee.country,
          startDate:
            updateData.startDate !== undefined
              ? updateData.startDate
              : originalLicensee.startDate,
          expiryDate:
            updateData.expiryDate !== undefined
              ? updateData.expiryDate
              : originalLicensee.expiryDate,
          prevStartDate:
            updateData.prevStartDate !== undefined
              ? updateData.prevStartDate
              : originalLicensee.prevStartDate,
          prevExpiryDate:
            updateData.prevExpiryDate !== undefined
              ? updateData.prevExpiryDate
              : originalLicensee.prevExpiryDate,
          isPaid: newIsPaid,
        }
      );

      await logActivity({
        action: 'UPDATE',
        details: `Updated licensee "${
          (updateData.name as string) || originalLicensee.name
        }"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'licensee',
          resourceId: _id,
          resourceName: (updateData.name as string) || originalLicensee.name,
          changes: changes,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  const [formattedLicensee] = await formatLicenseesForResponse([
    updatedLicensee,
  ]);

  return formattedLicensee;
}

/**
 * Soft deletes a licensee with activity logging
 */
export async function deleteLicensee(_id: string, request: NextRequest) {
  const currentUser = await getUserFromServer();
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

  if (currentUser && currentUser.emailAddress) {
    try {
      const deleteChanges = [
        { field: 'name', oldValue: licenseeToDelete.name, newValue: null },
        {
          field: 'description',
          oldValue: licenseeToDelete.description || '',
          newValue: null,
        },
        {
          field: 'country',
          oldValue: licenseeToDelete.country,
          newValue: null,
        },
        {
          field: 'licenseKey',
          oldValue: licenseeToDelete.licenseKey,
          newValue: null,
        },
        {
          field: 'startDate',
          oldValue: licenseeToDelete.startDate,
          newValue: null,
        },
        {
          field: 'expiryDate',
          oldValue: licenseeToDelete.expiryDate,
          newValue: null,
        },
        {
          field: 'isPaid',
          oldValue:
            licenseeToDelete.isPaid !== undefined
              ? licenseeToDelete.isPaid
              : licenseeToDelete.expiryDate
                ? new Date(licenseeToDelete.expiryDate) > new Date()
                : false,
          newValue: null,
        },
      ];

      await logActivity({
        action: 'DELETE',
        details: `Deleted licensee "${licenseeToDelete.name}"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'licensee',
          resourceId: _id,
          resourceName: licenseeToDelete.name,
          changes: deleteChanges,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  return deleted;
}

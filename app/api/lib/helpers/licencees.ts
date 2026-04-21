import { generateMongoId } from '@/lib/utils/id';
import { getClientIP } from '@/lib/utils/ipAddress';
import { NextRequest } from 'next/server';
import { Countries } from '../models/countries';
import { Licencee } from '../models/licencee';
import { generateUniqueLicenceKey } from '../utils/licenceKey';
import { calculateChanges, logActivity } from './activityLogger';
import { getUserFromServer } from './users';

/**
 * Formats licencees data for frontend consumption, ensuring isPaid status is always defined
 */
export async function formatLicenceesForResponse(
  licencees: Record<string, unknown>[]
) {
  const countryIds = Array.from(
    new Set(
      licencees
        .map(licencee =>
          typeof licencee.country === 'string' && licencee.country.trim() !== ''
            ? (licencee.country as string)
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

  return licencees.map(licencee => {
    let isPaid = licencee.isPaid;
    if (typeof isPaid === 'undefined') {
      if (licencee.expiryDate) {
        isPaid = new Date(licencee.expiryDate as string | Date) > new Date();
      } else {
        isPaid = false;
      }
    }

    const rawCountry = licencee.country;
    const country =
      typeof rawCountry === 'string'
        ? rawCountry
        : rawCountry &&
            typeof (rawCountry as { toString: () => string }).toString ===
              'function'
          ? (rawCountry as { toString: () => string }).toString()
          : '';
    const countryName = countryNameMap.get(country) || country || undefined;

    const includeJackpot = Boolean(licencee.includeJackpot ?? false);

    return {
      ...licencee,
      isPaid,
      country,
      countryName,
      includeJackpot,
      lastEdited: licencee.updatedAt,
    };
  });
}

/**
 * Retrieves all licencees from database
 */
export async function getAllLicencees() {
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
      includeJackpot: 1,
      gameDayOffset: 1,
    }
  )
    .sort({ name: 1 })
    .lean();
}

/**
 * Creates a new licencee with activity logging
 */
export async function createLicencee(
  data: {
    name: string;
    description?: string;
    country: string;
    startDate?: string;
    expiryDate?: string;
    includeJackpot?: boolean;
    gameDayOffset?: number;
  },
  request: NextRequest
) {
  const { name, description, country, startDate, expiryDate, includeJackpot, gameDayOffset } =
    data;
  const currentUser = await getUserFromServer();
  const newId = await generateMongoId();
  const licenceKey = await generateUniqueLicenceKey();

  const finalStartDate = startDate ? new Date(startDate) : new Date();
  let finalExpiryDate = null;
  if (expiryDate) {
    finalExpiryDate = new Date(expiryDate);
  } else {
    finalExpiryDate = new Date(finalStartDate);
    finalExpiryDate.setDate(finalExpiryDate.getDate() + 30);
  }

  const licencee = await Licencee.create({
    _id: newId,
    name,
    description: description || '',
    country,
    startDate: finalStartDate,
    expiryDate: finalExpiryDate,
    licenceKey,
    lastEdited: new Date(),
    includeJackpot: includeJackpot || false,
    gameDayOffset: gameDayOffset ?? 8,
  });

  if (currentUser && currentUser.emailAddress) {
    try {
      await logActivity({
        action: 'CREATE',
        details: `Created licencee "${name}"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'licencee',
          resourceId: newId,
          resourceName: name,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  const [formattedLicencee] = await formatLicenceesForResponse([
    licencee.toObject(),
  ]);

  return formattedLicencee;
}

/**
 * Updates an existing licencee with activity logging
 */
export async function updateLicencee(
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
    includeJackpot?: boolean;
    gameDayOffset?: number;
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
    includeJackpot,
    gameDayOffset,
  } = data;

  const currentUser = await getUserFromServer();
  const originalLicencee = (await Licencee.findOne({ _id }).lean()) as {
    _id: string;
    name: string;
    description?: string;
    country: string;
    startDate?: Date;
    expiryDate?: Date;
    prevStartDate?: Date;
    prevExpiryDate?: Date;
    isPaid?: boolean;
    licenceKey?: string;
  } | null;

  if (!originalLicencee) {
    throw new Error('Licencee not found');
  }

  const updateData: Record<string, unknown> = { lastEdited: new Date() };

  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (country !== undefined) updateData.country = country;
  if (startDate !== undefined) {
    if (
      originalLicencee.startDate &&
      startDate !== originalLicencee.startDate.toISOString()
    ) {
      updateData.prevStartDate = originalLicencee.startDate;
    }
    updateData.startDate = startDate ? new Date(startDate) : null;
  }
  if (expiryDate !== undefined) {
    if (
      originalLicencee.expiryDate &&
      expiryDate !== originalLicencee.expiryDate.toISOString()
    ) {
      updateData.prevExpiryDate = originalLicencee.expiryDate;
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
  if (includeJackpot !== undefined) {
    updateData.includeJackpot = Boolean(includeJackpot);
  }
  if (gameDayOffset !== undefined) {
    updateData.gameDayOffset = Number(gameDayOffset);
  }

  const updated = await Licencee.findOneAndUpdate({ _id }, updateData, {
    new: true,
  });

  if (!updated) {
    throw new Error('Licencee not found');
  }

  const updatedLicencee = updated.toObject();
  if (typeof updatedLicencee.isPaid === 'undefined') {
    if (updatedLicencee.expiryDate) {
      updatedLicencee.isPaid =
        new Date(updatedLicencee.expiryDate) > new Date();
    } else {
      updatedLicencee.isPaid = false;
    }
  }

  if (currentUser && currentUser.emailAddress) {
    try {
      const oldIsPaid =
        typeof originalLicencee.isPaid === 'undefined'
          ? false
          : originalLicencee.isPaid;
      const newIsPaid =
        typeof updateData.isPaid === 'undefined'
          ? oldIsPaid
          : updateData.isPaid;

      const changes = calculateChanges(
        {
          name: originalLicencee.name,
          description: originalLicencee.description,
          country: originalLicencee.country,
          startDate: originalLicencee.startDate,
          expiryDate: originalLicencee.expiryDate,
          prevStartDate: originalLicencee.prevStartDate,
          prevExpiryDate: originalLicencee.prevExpiryDate,
          isPaid: oldIsPaid,
        },
        {
          name: updateData.name || originalLicencee.name,
          description:
            updateData.description !== undefined
              ? updateData.description
              : originalLicencee.description,
          country: updateData.country || originalLicencee.country,
          startDate:
            updateData.startDate !== undefined
              ? updateData.startDate
              : originalLicencee.startDate,
          expiryDate:
            updateData.expiryDate !== undefined
              ? updateData.expiryDate
              : originalLicencee.expiryDate,
          prevStartDate:
            updateData.prevStartDate !== undefined
              ? updateData.prevStartDate
              : originalLicencee.prevStartDate,
          prevExpiryDate:
            updateData.prevExpiryDate !== undefined
              ? updateData.prevExpiryDate
              : originalLicencee.prevExpiryDate,
          isPaid: newIsPaid,
        }
      );

      await logActivity({
        action: 'UPDATE',
        details: `Updated licencee "${
          (updateData.name as string) || originalLicencee.name
        }"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'licencee',
          resourceId: _id,
          resourceName: (updateData.name as string) || originalLicencee.name,
          changes: changes,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  const [formattedLicencee] = await formatLicenceesForResponse([
    updatedLicencee,
  ]);

  return formattedLicencee;
}

/**
 * Soft deletes a licencee with activity logging
 */
export async function deleteLicencee(_id: string, request: NextRequest) {
  const currentUser = await getUserFromServer();
  // CRITICAL: Use findOne with _id instead of findById (repo rule)
  const licenceeToDelete = await Licencee.findOne({ _id });

  if (!licenceeToDelete) {
    throw new Error('Licencee not found');
  }

  // CRITICAL: Use findOneAndUpdate with _id instead of findByIdAndUpdate (repo rule)
  const deleted = await Licencee.findOneAndUpdate(
    { _id },
    { deletedAt: new Date() },
    { new: true }
  );

  if (!deleted) {
    throw new Error('Licencee not found');
  }

  if (currentUser && currentUser.emailAddress) {
    try {
      const deleteChanges = [
        { field: 'name', oldValue: licenceeToDelete.name, newValue: null },
        {
          field: 'description',
          oldValue: licenceeToDelete.description || '',
          newValue: null,
        },
        {
          field: 'country',
          oldValue: licenceeToDelete.country,
          newValue: null,
        },
        {
          field: 'licenceKey',
          oldValue: licenceeToDelete.licenceKey,
          newValue: null,
        },
        {
          field: 'startDate',
          oldValue: licenceeToDelete.startDate,
          newValue: null,
        },
        {
          field: 'expiryDate',
          oldValue: licenceeToDelete.expiryDate,
          newValue: null,
        },
        {
          field: 'isPaid',
          oldValue:
            licenceeToDelete.isPaid !== undefined
              ? licenceeToDelete.isPaid
              : licenceeToDelete.expiryDate
                ? new Date(licenceeToDelete.expiryDate) > new Date()
                : false,
          newValue: null,
        },
      ];

      await logActivity({
        action: 'DELETE',
        details: `Deleted licencee "${licenceeToDelete.name}"`,
        ipAddress: getClientIP(request) || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          userId: currentUser._id as string,
          userEmail: currentUser.emailAddress as string,
          userRole: (currentUser.roles as string[])?.[0] || 'user',
          resource: 'licencee',
          resourceId: _id,
          resourceName: licenceeToDelete.name,
          changes: deleteChanges,
        },
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError);
    }
  }

  return deleted;
}


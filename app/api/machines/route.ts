/**
 * Machines API Route
 *
 * This route handles CRUD operations for gaming machines.
 * It supports:
 * - Fetching machines by ID or location
 * - Creating new machines
 * - Updating existing machines
 * - Soft deleting machines
 * - Time period filtering for meter data
 * - Location-based access control
 * - Meter data aggregation
 *
 * @module app/api/machines/route
 */

import { calculateChanges, logActivity } from '@/app/api/lib/helpers/activityLogger';
import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { Machine } from '@/app/api/lib/models/machines';
import { generateMongoId } from '@/lib/utils/id';
import type { GamingMachine } from '@/shared/types/entities';
import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
// TODO: Move these to shared types or create new ones
type NewMachineData = Omit<GamingMachine, '_id' | 'createdAt' | 'updatedAt'> & {
  collectionSettings?: {
    lastCollectionTime?: string;
    lastMetersIn?: string;
    lastMetersOut?: string;
  };
};

// Validation helpers mirroring frontend rules
function validateSerialNumber(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim().length < 3) {
    return 'Serial number must be at least 3 characters long';
  }
  return null;
}

function normalizeSerialNumber(value: string): string {
  return value.toUpperCase();
}

function validateSmibBoard(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    // Optional field – no error when empty
    return null;
  }
  if (typeof value !== 'string') {
    return 'SMIB Board must be a string';
  }
  const v = value.toLowerCase();
  if (v.length !== 12) {
    return 'SMIB Board must exactly be 12 characters long';
  }
  if (!/^[0-9a-f]+$/.test(v)) {
    return 'SMIB Board must contain only lowercase hexadecimal characters (0-9, a-f)';
  }
  const lastChar = v.charAt(11);
  if (!['0', '4', '8', 'c'].includes(lastChar)) {
    return 'SMIB Board must end with 0, 4, 8, or c';
  }
  return null;
}

function normalizeSmibBoard(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.toLowerCase();
}

/**
 * Main GET handler for fetching machines
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async ({ userRoles }) => {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    const locationId = searchParams.get('locationId');
    const serialNumberToCheck = searchParams.get('checkSerial');
    const smibToCheck = searchParams.get('checkSmib');
    const customNameToCheck = searchParams.get('checkCustomName');
    const excludeId = searchParams.get('excludeId');
    const showArchived = searchParams.get('archived') === 'true';

    // ============================================================================
    // STEP 3: Validate parameters
    // ============================================================================
    if (serialNumberToCheck || smibToCheck || customNameToCheck) {
      // AVAILABILITY CHECKS
      const query: Record<string, unknown> = {
        $or: [
          { deletedAt: null },
          { deletedAt: { $lt: new Date('2025-01-01') } },
        ],
      };

      if (serialNumberToCheck) {
        query.serialNumber = normalizeSerialNumber(serialNumberToCheck);
      } else if (smibToCheck) {
        query.relayId = normalizeSmibBoard(smibToCheck);
      } else if (customNameToCheck) {
        query['custom.name'] = customNameToCheck.trim();
      }

      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existing = await Machine.findOne(query).lean();
      return NextResponse.json({
        success: true,
        available: !existing,
      });
    }

    if (!id && !locationId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Either machine ID or location ID is required',
        },
        { status: 400 }
      );
    }

    // ============================================================================
    // STEP 4: Route to appropriate fetch logic
    // ============================================================================
    let result;
    if (id) {
      // SINGLE MACHINE LOGIC
      const machine = (await Machine.findOne({
        _id: id,
      }).lean()) as GamingMachine | null;
      if (!machine) {
        return NextResponse.json(
          { success: false, error: 'Machine not found' },
          { status: 404 }
        );
      }

      // Check access
      const hasAccess = await checkUserLocationAccess(
        machine.gamingLocation as string
      );
      if (
        !hasAccess &&
        !userRoles.includes('developer') &&
        !userRoles.includes('owner') &&
        !userRoles.includes('admin')
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      result = machine;
    } else {
      // LOCATION-BASED LOGIC
      const hasAccess = await checkUserLocationAccess(locationId as string);
      if (
        !hasAccess &&
        !userRoles.includes('developer') &&
        !userRoles.includes('admin')
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }

      const query: Record<string, unknown> = { gamingLocation: locationId };
      if (!showArchived) {
        // Active machines use deletedAt sentinel new Date(-1) (Dec 31 1969) by convention,
        // not null. Must also match null/missing for machines created without the sentinel.
        query.$or = [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }];
      }

      result = await Machine.find(query).lean();
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  });
}

/**
 * Main POST handler for creating a new machine
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async () => {
    const data = (await request.json()) as NewMachineData;

    // Validation
    const serialNumberError = validateSerialNumber(data.serialNumber);
    if (serialNumberError)
      return NextResponse.json(
        { success: false, error: serialNumberError },
        { status: 400 }
      );

    const smibError = validateSmibBoard(data.smibBoard);
    if (smibError)
      return NextResponse.json(
        { success: false, error: smibError },
        { status: 400 }
      );

    data.serialNumber = normalizeSerialNumber(data.serialNumber);
    data.smibBoard = normalizeSmibBoard(data.smibBoard) ?? '';

    // Step 1: Duplicate checks
    const activeCriteria = {
      $or: [
        { deletedAt: null },
        { deletedAt: { $lt: new Date('2025-01-01') } },
      ],
    };

    const duplicateCheck = (await Machine.findOne({
      $and: [
        {
          $or: [
            { serialNumber: data.serialNumber },
            { relayId: data.smibBoard },
            ...(data.custom?.name
              ? [{ 'custom.name': data.custom.name.trim() }]
              : []),
          ],
        },
        activeCriteria,
      ],
    }).lean()) as GamingMachine | null;

    if (duplicateCheck) {
      let error = 'Record already exists';
      if (duplicateCheck.serialNumber === data.serialNumber)
        error = 'Serial number already exists';
      else if (duplicateCheck.relayId === data.smibBoard)
        error = 'SMIB board already exists';
      else if (duplicateCheck.custom?.name === data.custom?.name?.trim())
        error = 'Machine custom name already exists';

      return NextResponse.json({ success: false, error }, { status: 400 });
    }

    if (!data.gamingLocation)
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      );

    const machineId = await generateMongoId();
    const newMachine = new Machine({
      _id: machineId,
      ...data,
      isSasMachine: !data.isCronosMachine,
      loggedIn: false,
    });

    await newMachine.save();

    revalidatePath('/cabinets');
    revalidatePath('/machines');

    return NextResponse.json(
      { success: true, data: newMachine },
      { status: 201 }
    );
  });
}

/**
 * Main PUT handler for updating a machine
 */
export async function PUT(request: NextRequest) {
  return withApiAuth(request, async () => {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    if (!id)
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );

    const data = await request.json();
    const activeCriteria = {
      $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
    };

    if (data.serialNumber || data.relayId || data.smibBoard || data.custom?.name) {
      const normalizedSerial = data.serialNumber
        ? normalizeSerialNumber(data.serialNumber)
        : undefined;
      const normalizedSmib = (data.relayId ?? data.smibBoard ?? data.smbId) !== undefined
        ? normalizeSmibBoard(data.relayId ?? data.smibBoard ?? data.smbId)
        : undefined;
      const trimmedCustomName = data.custom?.name?.trim();

      const duplicateCheck = (await Machine.findOne({
        _id: { $ne: id },
        $and: [
          {
            $or: [
              ...(normalizedSerial ? [{ serialNumber: normalizedSerial }] : []),
              ...(normalizedSmib ? [{ relayId: normalizedSmib }] : []),
              ...(trimmedCustomName
                ? [{ 'custom.name': trimmedCustomName }]
                : []),
            ],
          },
          activeCriteria,
        ],
      }).lean()) as GamingMachine | null;

      if (duplicateCheck) {
        let error = 'Record already exists';
        if (
          normalizedSerial &&
          duplicateCheck.serialNumber === normalizedSerial
        )
          error = 'Serial number already exists';
        else if (normalizedSmib && duplicateCheck.relayId === normalizedSmib)
          error = 'SMIB board already exists';
        else if (
          trimmedCustomName &&
          duplicateCheck.custom?.name === trimmedCustomName
        )
          error = 'Machine custom name already exists';

        return NextResponse.json({ success: false, error }, { status: 400 });
      }

      // Update values if normalized
      if (normalizedSerial) data.serialNumber = normalizedSerial;
      if (normalizedSmib) {
        data.relayId = normalizedSmib;
        data.smibBoard = normalizedSmib;
      }
    }

    // Fetch original document for activity logging (before/after diff)
    const originalMachine = await Machine.findOne({ _id: id }).lean() as GamingMachine | null;
    if (!originalMachine) {
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );
    }

    console.log(`[Machines PUT] Updating machine ${id}`);

    // ============================================================================
    // STEP 6: Build update fields from request data
    // ============================================================================
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    // Use robust mapping instead of naive $set to handle aliases and nested fields
    if (data.assetNumber !== undefined && data.assetNumber !== '') {
      updateFields.serialNumber = data.assetNumber;
      updateFields.assetNumber = data.assetNumber;
    } else if (data.serialNumber) {
      updateFields.serialNumber = data.serialNumber;
    }

    if (data.installedGame !== undefined && data.installedGame !== '') {
      updateFields.game = data.installedGame;
    } else if (data.game) {
      updateFields.game = data.game;
    }

    if (data.gameType !== undefined && data.gameType !== '') {
      updateFields.gameType = data.gameType;
    }

    if (data.manufacturer !== undefined && data.manufacturer !== '') {
      updateFields.manufacturer = data.manufacturer;
      updateFields.manuf = data.manufacturer;
    } else if (data.manuf) {
      updateFields.manuf = data.manuf;
      updateFields.manufacturer = data.manuf;
    }

    // Handle SMIB board fields consistently
    const smibValue = data.smbId ?? data.smibBoard ?? data.relayId;
    if (smibValue !== undefined) {
      updateFields.relayId = smibValue;
      updateFields.smibBoard = smibValue;
      updateFields.smbId = smibValue;
    }

    if (data.status !== undefined && data.status !== '') {
      updateFields.assetStatus = data.status;
    } else if (data.assetStatus) {
      updateFields.assetStatus = data.assetStatus;
    }

    if (data.cabinetType !== undefined && data.cabinetType !== '') {
      updateFields.cabinetType = data.cabinetType;
    }

    if (data.accountingDenomination !== undefined && data.accountingDenomination !== '') {
      updateFields['gameConfig.accountingDenomination'] = Number(data.accountingDenomination);
    }

    const multValue = data.collectionMultiplier ?? data.collectorDenomination;
    if (multValue !== undefined && multValue !== '') {
      updateFields.collectionMultiplier = String(multValue);
      updateFields.collectorDenomination = Number(multValue) || 1;
    }

    if (data.isCronosMachine !== undefined) {
      updateFields.isSasMachine = !data.isCronosMachine;
    } else if (data.isSasMachine !== undefined) {
       updateFields.isSasMachine = data.isSasMachine;
    }

    const locationValue = data.location ?? data.locationId ?? data.gamingLocation;
    if (locationValue !== undefined && locationValue !== '') {
      updateFields.gamingLocation = locationValue;
    }

    // Handle collection meters / settings
    const colMeters = data.collectionMeters ?? data.collectionSettings;
    if (colMeters !== undefined) {
      const metersUpdate: Record<string, number> = {};
      const metersIn = colMeters.metersIn ?? colMeters.lastMetersIn;
      const metersOut = colMeters.metersOut ?? colMeters.lastMetersOut;

      if (metersIn !== undefined && metersIn !== '') {
        metersUpdate.metersIn = Number(metersIn) || 0;
      }
      if (metersOut !== undefined && metersOut !== '') {
        metersUpdate.metersOut = Number(metersOut) || 0;
      }

      if (Object.keys(metersUpdate).length > 0) {
        updateFields.collectionMeters = metersUpdate;
      }
    }

    const colTimeValue = data.collectionTime ?? data.collectionSettings?.lastCollectionTime;
    if (colTimeValue !== undefined && colTimeValue !== '') {
      updateFields.collectionTime = new Date(colTimeValue);
    }

    if (data.custom !== undefined) {
      if (data.custom && typeof data.custom === 'object' && data.custom.name !== undefined) {
        updateFields['custom.name'] = data.custom.name;
      }
    }

    const updatedMachine = await Machine.findOneAndUpdate(
      { _id: id },
      { $set: updateFields },
      { new: true }
    );

    if (!updatedMachine)
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );

    revalidatePath('/cabinets');
    revalidatePath('/machines');

    console.log(`[Machines PUT] Machine ${id} updated successfully`);

    // Fire-and-forget activity log
    const machineUser = await getUserFromServer();
    if (machineUser) {
      logActivity({
        action: 'update',
        details: `Machine ${originalMachine.serialNumber || id} updated`,
        userId: String(machineUser._id),
        username: String(machineUser.username || machineUser.email || machineUser._id),
        metadata: {
          resource: 'machine',
          resourceId: id,
          resourceName: originalMachine.serialNumber || id,
          changes: calculateChanges(
            originalMachine as unknown as Record<string, unknown>,
            data as Record<string, unknown>
          ),
          previousData: originalMachine,
          newData: updatedMachine.toObject(),
        },
      }).catch(err => console.error('[Machines PUT] Activity log failed:', err));
    }

    return NextResponse.json({
      success: true,
      data: updatedMachine,
    });
  });
}

/**
 * Main DELETE handler for soft deleting a machine
 */
export async function DELETE(request: NextRequest) {
  return withApiAuth(request, async ({ isAdminOrDev }) => {
    const id = request.nextUrl.searchParams.get('id');
    if (!id)
      return NextResponse.json(
        { success: false, error: 'Machine ID is required' },
        { status: 400 }
      );

    const machineToDelete = await Machine.findOne({ _id: id });
    if (!machineToDelete)
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );

    const hardDelete =
      request.nextUrl.searchParams.get('hardDelete') === 'true';
    if (hardDelete && isAdminOrDev) {
      await Machine.deleteOne({ _id: id });
    } else {
      await Machine.findOneAndUpdate(
        { _id: id },
        { $set: { deletedAt: new Date(), updatedAt: new Date() } }
      );
    }

    revalidatePath('/cabinets');
    revalidatePath('/machines');

    return NextResponse.json({
      success: true,
      message: 'Machine deleted successfully',
    });
  });
}

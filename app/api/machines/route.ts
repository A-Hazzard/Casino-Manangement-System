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

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { Machine } from '@/app/api/lib/models/machines';
import { convertResponseToTrinidadTime } from '@/app/api/lib/utils/timezone';
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
    const showArchived = searchParams.get('archived') === 'true';

    // ============================================================================
    // STEP 3: Validate parameters
    // ============================================================================
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
        query.$or = [{ deletedAt: null }, { deletedAt: { $exists: false } }];
      }

      result = await Machine.find(query).lean();
    }

    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(result),
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
      { success: true, data: convertResponseToTrinidadTime(newMachine) },
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
    const updatedMachine = await Machine.findOneAndUpdate(
      { _id: id },
      { $set: data },
      { new: true }
    );

    if (!updatedMachine)
      return NextResponse.json(
        { success: false, error: 'Machine not found' },
        { status: 404 }
      );

    revalidatePath('/cabinets');
    revalidatePath('/machines');

    return NextResponse.json({
      success: true,
      data: convertResponseToTrinidadTime(updatedMachine),
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

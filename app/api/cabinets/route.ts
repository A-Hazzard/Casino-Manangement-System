/**
 * Cabinets API Route
 *
 * This route handles CRUD operations for gaming cabinets (machines).
 * It supports:
 * - Fetching cabinets by ID or location
 * - Creating new cabinets with initial baselines
 * - Updating existing cabinets
 * - Soft deleting cabinets
 * - Availability checks (serial, SMIB, custom name)
 * - Location-based access control
 *
 * @module app/api/cabinets/route
 */

import { checkUserLocationAccess } from '@/app/api/lib/helpers/licenceeFilter';
import { withApiAuth } from '@/app/api/lib/helpers/apiWrapper';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import { Machine } from '@/app/api/lib/models/machines';
import { generateMongoId } from '@/lib/utils/id';
import { revalidatePath } from 'next/cache';
import { logActivity } from '@/app/api/lib/helpers/activityLogger';
import { NextRequest, NextResponse } from 'next/server';
import type { MachinePayload } from '@/shared/types/machines';

// Validation helpers
function normalizeSerialNumber(value: string): string {
  return value.toUpperCase();
}

function normalizeSmibBoard(value: string | undefined): string | undefined {
  if (!value) return value;
  return value.toLowerCase();
}

/**
 * GET handler for fetching cabinets
 */
export async function GET(request: NextRequest) {
  return withApiAuth(request, async () => {
    const { searchParams } = request.nextUrl;
    const id = searchParams.get('id');
    const locationId = searchParams.get('locationId');
    const serialNumberToCheck = searchParams.get('checkSerial');
    const smibToCheck = searchParams.get('checkSmib');
    const customNameToCheck = searchParams.get('checkCustomName');
    const excludeId = searchParams.get('excludeId');
    const showArchived = searchParams.get('archived') === 'true';

    if (serialNumberToCheck || smibToCheck || customNameToCheck) {
      const query: Record<string, string | number | boolean | object | null | (string | number | boolean | object | null)[]> = {
        $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }],
      };
      if (serialNumberToCheck) query.serialNumber = normalizeSerialNumber(serialNumberToCheck);
      else if (smibToCheck) query.relayId = normalizeSmibBoard(smibToCheck) || '';
      else if (customNameToCheck) query['custom.name'] = customNameToCheck.trim();

      if (excludeId) query._id = { $ne: excludeId };
      const existing = await Machine.findOne(query).lean();
      return NextResponse.json({ success: true, available: !existing });
    }

    if (!id && !locationId) {
      return NextResponse.json({ success: false, error: 'ID or locationId required' }, { status: 400 });
    }

    if (id) {
      const cabinet = await Machine.findOne({ _id: id }).lean();
      if (!cabinet) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
      return NextResponse.json({ success: true, data: cabinet });
    }

    const hasAccess = await checkUserLocationAccess(locationId as string);
    if (!hasAccess) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });

    const query: Record<string, string | number | boolean | object | null | (string | number | boolean | object | null)[]> = { gamingLocation: locationId as string };
    if (!showArchived) query.$or = [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }];
    const cabinets = await Machine.find(query).lean();
    return NextResponse.json({ success: true, data: cabinets });
  });
}

/**
 * POST handler - Create new cabinet
 */
export async function POST(request: NextRequest) {
  return withApiAuth(request, async () => {
    const data = (await request.json()) as MachinePayload & { locationId?: string; relayId?: string; installedGame?: string; status?: string; collectionMultiplier?: number; collectionTime?: string; collectionMeters?: { metersIn: number; metersOut: number }; manuf?: string };
    if (!data.gamingLocation && data.locationId) data.gamingLocation = data.locationId;

    if (!data.gamingLocation) return NextResponse.json({ success: false, error: 'Location required' }, { status: 400 });

    // Deduplication
    const normalizedSerial = normalizeSerialNumber(data.serialNumber);
    const normalizedSmib = normalizeSmibBoard(data.smibBoard || data.relayId) ?? '';
    
    const existing = await Machine.findOne({
      $and: [
        { $or: [{ serialNumber: normalizedSerial }, ...(normalizedSmib ? [{ relayId: normalizedSmib }] : [])] },
        { $or: [{ deletedAt: null }, { deletedAt: { $lt: new Date('2025-01-01') } }] }
      ]
    }).lean();

    if (existing) return NextResponse.json({ success: false, error: 'Cabinet already exists (Serial or SMIB duplicate)' }, { status: 400 });

    const machineId = await generateMongoId();
    const smibValue = normalizedSmib;

    const newCabinet = new Machine({
      _id: machineId,
      serialNumber: normalizedSerial,
      game: data.game || data.installedGame || '',
      gameType: data.gameType || 'slot',
      isSasMachine: data.isCronosMachine ? false : true,
      gamingLocation: data.gamingLocation,
      assetStatus: data.assetStatus || data.status || 'Active',
      cabinetType: data.cabinetType || '',
      relayId: smibValue,
      smibBoard: smibValue,
      smbId: smibValue,
      collectorDenomination: Number(data.collectorDenomination || data.collectionMultiplier || 1),
      gameConfig: {
        accountingDenomination: Number(data.accountingDenomination || 0)
      },
      collectionTime: data.collectionSettings?.lastCollectionTime || data.collectionTime,
      collectionMeters: {
        metersIn: Number(data.collectionSettings?.lastMetersIn || data.collectionMeters?.metersIn || 0),
        metersOut: Number(data.collectionSettings?.lastMetersOut || data.collectionMeters?.metersOut || 0),
      },
      custom: { name: data.custom?.name || normalizedSerial },
      manuf: data.manufacturer || data.manuf || '',
      manufacturer: data.manufacturer || data.manuf || '',
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: new Date(-1),
      // Default SAS meters to sync with initial collection meters
      sasMeters: {
        drop: Number(data.collectionSettings?.lastMetersIn || 0),
        totalCancelledCredits: Number(data.collectionSettings?.lastMetersOut || 0)
      }
    });

    await newCabinet.save();

    // Log activity
    const currentUser = await getUserFromServer();
    if (currentUser) {
      logActivity({
        action: 'CREATE',
        details: `Cabinet ${normalizedSerial} created for location ${data.gamingLocation}`,
        userId: currentUser._id as string,
        username: currentUser.emailAddress as string,
        metadata: { resource: 'cabinet', resourceId: machineId, resourceName: normalizedSerial }
      }).catch((err: unknown) => console.error('Failed to log create:', err));
    }

    revalidatePath('/cabinets');
    return NextResponse.json({ success: true, data: newCabinet }, { status: 201 });
  });
}

/**
 * PUT handler for updating cabinets
 * (Legacy support - typically use /api/cabinets/[cabinetId])
 */
export async function PUT(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });
  
  // Forward to new implementation logic or implement briefly here
  // For now, let's just implement the basic update to maintain root PUT support
  return withApiAuth(request, async () => {
    const data = await request.json();
    const updated = await Machine.findOneAndUpdate({ _id: id }, { $set: { ...data, updatedAt: new Date() } }, { new: true });
    revalidatePath('/cabinets');
    return NextResponse.json({ success: true, data: updated });
  });
}

/**
 * DELETE handler
 * (Legacy support - typically use /api/cabinets/[cabinetId])
 */
export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

  return withApiAuth(request, async () => {
    await Machine.findOneAndUpdate({ _id: id }, { $set: { deletedAt: new Date(), updatedAt: new Date() } });
    revalidatePath('/cabinets');
    return NextResponse.json({ success: true, message: 'Deleted' });
  });
}


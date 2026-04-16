/**
 * POST /api/collection-report/check-variations
 *
 * Checks for variations between meter readings and SAS data for unsaved collection report machines.
 * Useful for pre-submission validation before creating/updating a collection report.
 *
 * Request body:
 * - locationId: string (ID of the gaming location)
 * - machines: Array of { machineId, metersIn, metersOut } (unsaved collection data)
 * - includeJackpot?: boolean (optional, will fetch from licencee if not provided)
 *
 * Response:
 * - hasVariations: boolean (true if any machine has a variation)
 * - totalVariation: number (sum of all variations)
 * - machines: Array of machines with variation details
 */

import type { NextRequest } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { createSuccessResponse, createErrorResponse } from '@/app/api/lib/utils/apiResponse';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import type { MongooseId } from '@/shared/types';
interface CheckVariationsRequest {
  locationId: string;
  machines: Array<{
    machineId: string;
    machineName?: string;
    metersIn: number;
    metersOut: number;
    sasStartTime?: string;
    sasEndTime?: string;
    prevMetersIn?: number;
    prevMetersOut?: number;
    /** Pre-calculated movement gross from a saved collection document.
     * When provided, used as meterGross instead of recalculating from raw meters.
     * Ensures RAM-clear entries match the report detail page calculation. */
    movementGross?: number;
  }>;
  includeJackpot?: boolean;
}

interface MachineVariationData {
  machineId: string;
  machineName: string;
  variation: number | string;
  sasGross: number | string;
  meterGross: number;
  sasStartTime?: string | null;
  sasEndTime?: string | null;
}

interface CheckVariationsResponse {
  hasVariations: boolean;
  totalVariation: number;
  machines: MachineVariationData[];
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = (await request.json()) as CheckVariationsRequest;
    const { locationId, machines, includeJackpot: userProvidedIncludeJackpot } = body;

    if (!locationId || !machines || machines.length === 0) {
      return createErrorResponse(
        'Invalid request: locationId and machines array required',
        400,
        'INVALID_REQUEST'
      );
    }

    // Fetch licencee's includeJackpot flag if not provided
    let includeJackpot = userProvidedIncludeJackpot ?? false;
    try {
      const location = await GamingLocations.findOne(
        { _id: locationId as unknown as MongooseId },
        { 'rel.licencee': 1 }
      ).lean() as { rel?: { licencee?: string } } | null;

      const licenceeId = location?.rel?.licencee;
      if (licenceeId) {
        const { Licencee } = await import('@/app/api/lib/models/licencee');
        const licenceeDoc = (await Licencee.findOne(
          { _id: licenceeId },
          { includeJackpot: 1 }
        ).lean()) as Record<string, unknown> | null;
        includeJackpot = Boolean(licenceeDoc?.includeJackpot);
      }
    } catch (err) {
      console.warn('[Collection Report] Could not fetch licencee includeJackpot:', err);
      // Continue with default value
    }

    // Fetch machine details (name, game) for display
    const machineIds = machines.map(m => m.machineId as unknown as MongooseId);
    const machineDetails = await Machine.find(
      { _id: { $in: machineIds } },
      { machineId: 1, serialNumber: 1, custom: 1, game: 1, machineCustomName: 1, machineName: 1 }
    ).lean() as Array<{
      _id: string;
      machineId?: string;
      serialNumber?: string;
      custom?: { name?: string };
      game?: string;
      machineCustomName?: string;
      machineName?: string;
    }>;

    const machineDetailsMap = new Map(machineDetails.map(m => [m._id, m]));

    // Fetch SAS meter data for machines with SAS time ranges
    const { Meters } = await import('@/app/api/lib/models/meters');

    const meterQueries = machines
      .filter(m => m.sasStartTime && m.sasEndTime)
      .map(m => ({
        machineId: m.machineId,
        startTime: new Date(m.sasStartTime!),
        endTime: new Date(m.sasEndTime!),
      }));

    const allMeterData: Array<{
      _id: string;
      totalDrop: number;
      totalCancelled: number;
      totalJackpot: number;
    }> = [];

    if (meterQueries.length > 0) {
      const cursor = Meters.aggregate([
        {
          $match: {
            $or: meterQueries.map(q => ({
              machine: q.machineId,
              readAt: { $gte: q.startTime, $lte: q.endTime },
            })),
          },
        },
        {
          $group: {
            _id: '$machine',
            totalDrop: { $sum: { $ifNull: ['$movement.drop', 0] } },
            totalCancelled: { $sum: { $ifNull: ['$movement.totalCancelledCredits', 0] } },
            totalJackpot: { $sum: { $ifNull: ['$movement.jackpot', 0] } },
          },
        },
      ]).cursor({ batchSize: 1000 });

      for await (const doc of cursor) {
        allMeterData.push(doc);
      }
    }

    // Create lookup map
    const meterDataMap = new Map(
      allMeterData.map(m => [
        m._id,
        {
          drop: m.totalDrop,
          cancelled: m.totalCancelled,
          jackpot: m.totalJackpot,
        },
      ])
    );

    // Calculate variations for each machine
    const machineVariations: MachineVariationData[] = [];
    let totalVariation = 0;

    for (const machine of machines) {
      const machineDetail = machineDetailsMap.get(machine.machineId);

      // Use provided machine name if it exists, otherwise build it
      let machineName = machine.machineName;
      
      if (!machineName) {
        // Get display name components from DB fetch results
        const serialNumber = (machineDetail?.serialNumber || '').trim();
        const customName = (
          machineDetail?.custom?.name ||
          machineDetail?.machineCustomName ||
          machineDetail?.machineName ||
          ''
        ).trim();
        const game = (machineDetail?.game || '').trim();

        const mainIdentifier = serialNumber || customName || machine.machineId;
        const bracketParts: string[] = [];

        if (customName && customName !== mainIdentifier) {
          bracketParts.push(customName);
        }
        if (game) {
          bracketParts.push(game);
        }

        machineName = bracketParts.length > 0 
          ? `${mainIdentifier} (${bracketParts.join(', ')})`
          : mainIdentifier;
      }

      // Calculate meter gross — prefer pre-calculated movement.gross when available (e.g. from saved
      // collection entries) to ensure RAM-clear machines produce the same value as the report page.
      const meterGross =
        machine.movementGross !== undefined
          ? machine.movementGross
          : (machine.metersIn || 0) - (machine.prevMetersIn || 0) -
            ((machine.metersOut || 0) - (machine.prevMetersOut || 0));

      // Get SAS data
      let sasGross = 0;
      let jackpot = 0;

      if (machine.sasStartTime && machine.sasEndTime) {
        const meterData = meterDataMap.get(machine.machineId);
        if (meterData) {
          sasGross = meterData.drop - meterData.cancelled;
          jackpot = meterData.jackpot;
        }
      }

      // Apply jackpot adjustment
      const adjustedSasGross = includeJackpot ? sasGross - (jackpot || 0) : sasGross;

      const hasNoSasData =
        !machine.sasStartTime || !machine.sasEndTime || !meterDataMap.has(machine.machineId);

      const variation = meterGross - (hasNoSasData ? 0 : adjustedSasGross);
      totalVariation += variation;

      machineVariations.push({
        machineId: machine.machineId,
        machineName,
        variation,
        sasGross: hasNoSasData ? 'No SAS Data' : adjustedSasGross,
        meterGross,
        sasStartTime: machine.sasStartTime || null,
        sasEndTime: machine.sasEndTime || null,
      });
    }

    const hasVariations = machineVariations.some(m => typeof m.variation === 'number' && Math.abs(m.variation) > 0.1);

    return createSuccessResponse<CheckVariationsResponse>(
      {
        hasVariations,
        totalVariation,
        machines: machineVariations,
      },
      'Variation check completed'
    );
  } catch (error) {
    console.error('[API] check-variations error:', error);
    return createErrorResponse(
      'Failed to check variations',
      500,
      'CHECK_VARIATIONS_ERROR',
      error instanceof Error ? { message: error.message } : undefined
    );
  }
}

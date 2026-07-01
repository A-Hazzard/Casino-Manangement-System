/**
 * POST /api/collection-reports/check-variations  (Server-Sent Events)
 *
 * Streams a per-machine variation check for an UNSAVED set of collection entries,
 * before a report is submitted. Emits one progress event per machine so the UI can
 * show a live "checking k/N" count, then a final `done` event with the full result.
 *
 * Variation is computed with the SAME logic the report detail page uses
 * (`computeMachineVariation` + `aggregateMeterDataForWindows`), so the checker and the
 * saved report always agree. WOW machines are treated as SMIB (relay OR WOW), so they
 * are NO LONGER silently excluded — the previous relayId-only gate is gone.
 *
 * Body:
 *   - locationId    {string}   Required.
 *   - machines      {Array}    Required. Each: machineId, metersIn, metersOut, prevIn,
 *                              prevOut, movementGross?, sasStartTime?, sasEndTime?, machineName?
 *   - includeJackpot {boolean} Optional. Defaults to the licencee setting.
 *
 * @module app/api/collection-reports/check-variations/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/app/api/lib/middleware/db';
import { Machine } from '@/app/api/lib/models/machines';
import { GamingLocations } from '@/app/api/lib/models/gaminglocations';
import { createSseResponse } from '@/app/api/lib/utils/sseStream';
import { isWowMachine } from '@/shared/utils/wowMachine';
import {
  aggregateMeterDataForWindows,
  computeMachineVariation,
} from '@/app/api/lib/helpers/collectionReport/variation';
import { getUserFromServer } from '@/app/api/lib/helpers/users';
import type { GamingMachine } from '@/shared/types';

type CheckMachine = {
  machineId: string;
  machineName?: string;
  metersIn?: number;
  metersOut?: number;
  prevIn?: number;
  prevOut?: number;
  movementGross?: number;
  sasStartTime?: string;
  sasEndTime?: string;
};

type CheckVariationsBody = {
  locationId: string;
  machines: CheckMachine[];
  includeJackpot?: boolean;
};

type MachineVariationRow = {
  machineId: string;
  machineName: string;
  serialNumber?: string;
  machineCustomName?: string;
  meterGross: number;
  sasGross: number | null;
  variation: number | null;
  sasStartTime: string | null;
  sasEndTime: string | null;
};

/**
 * Builds a display name from machine details (serial → custom → game), falling back
 * to the client-provided name or the id.
 */
function buildMachineName(
  provided: string | undefined,
  detail: GamingMachine | undefined,
  machineId: string
): string {
  if (provided) return provided;
  const serialNumber = (detail?.serialNumber || '').trim();
  const customName = (detail?.custom?.name || '').trim();
  const game = (detail?.game || '').trim();
  const mainIdentifier = serialNumber || customName || machineId;
  const bracketParts: string[] = [];
  if (customName && customName !== mainIdentifier) bracketParts.push(customName);
  if (game) bracketParts.push(game);
  return bracketParts.length > 0
    ? `${mainIdentifier} (${bracketParts.join(', ')})`
    : mainIdentifier;
}

export async function POST(request: NextRequest): Promise<NextResponse | Response> {
  // ============================================================================
  // STEP 1: Connect + authenticate (must happen BEFORE opening the SSE stream)
  // ============================================================================
  await connectDB();
  const currentUser = await getUserFromServer();
  if (!currentUser) {
    return NextResponse.json({ message: 'User not found' }, { status: 404 });
  }

  // ============================================================================
  // STEP 2: Parse + validate body
  // ============================================================================
  let body: CheckVariationsBody;
  try {
    body = (await request.json()) as CheckVariationsBody;
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { locationId, machines, includeJackpot: includeJackpotOverride } = body;
  if (!locationId || !Array.isArray(machines) || machines.length === 0) {
    return NextResponse.json(
      { message: 'locationId and a non-empty machines array are required' },
      { status: 400 }
    );
  }

  // ============================================================================
  // STEP 3: Resolve licencee includeJackpot + machine relay/meta/display metadata
  // ============================================================================
  let includeJackpot = includeJackpotOverride ?? false;
  let isNoSMIBLocation = false;
  try {
    const location = await GamingLocations.findOne(
      { _id: locationId },
      { 'rel.licencee': 1, noSMIBLocation: 1 }
    ).lean<{ rel?: { licencee?: string }; noSMIBLocation?: boolean } | null>();
    isNoSMIBLocation = location?.noSMIBLocation === true;
    if (includeJackpotOverride === undefined && location?.rel?.licencee) {
      const { Licencee } = await import('@/app/api/lib/models/licencee');
      const licenceeDoc = await Licencee.findOne(
        { _id: location.rel.licencee },
        { includeJackpot: 1 }
      ).lean<{ includeJackpot?: boolean } | null>();
      includeJackpot = Boolean(licenceeDoc?.includeJackpot);
    }
  } catch (err) {
    console.error(
      '[check-variations] Could not resolve licencee settings:',
      err instanceof Error ? err.message : 'Unknown error'
    );
  }

  const machineIds = machines.map(machine => machine.machineId);
  const machineDetails = await Machine.find(
    { _id: { $in: machineIds } },
    { serialNumber: 1, custom: 1, game: 1, machineName: 1, relayId: 1, meta: 1 }
  ).lean<GamingMachine[]>();
  const detailMap = new Map(machineDetails.map(detail => [String(detail._id), detail]));

  // ============================================================================
  // STEP 4: Stream the per-machine check
  // ============================================================================
  return createSseResponse(async send => {
    const total = machines.length;
    const rows: MachineVariationRow[] = [];
    let totalVariation = 0;

    for (let index = 0; index < total; index++) {
      const machine = machines[index];
      const detail = detailMap.get(String(machine.machineId));
      const machineName = buildMachineName(machine.machineName, detail, machine.machineId);

      send({ type: 'progress', phase: 'checking', done: index, total, machineName });

      // Per-machine windowed meter sums (one indexed aggregation each) so progress
      // reflects real work as each machine is checked.
      const hasWindow = Boolean(machine.sasStartTime && machine.sasEndTime);
      const sumsMap = hasWindow
        ? await aggregateMeterDataForWindows([
            {
              machineId: machine.machineId,
              startTime: new Date(machine.sasStartTime!),
              endTime: new Date(machine.sasEndTime!),
            },
          ])
        : new Map();

      const result = computeMachineVariation(
        {
          metersIn: machine.metersIn,
          metersOut: machine.metersOut,
          prevIn: machine.prevIn,
          prevOut: machine.prevOut,
          movementGross: machine.movementGross,
          sasStartTime: machine.sasStartTime,
          sasEndTime: machine.sasEndTime,
        },
        sumsMap.get(machine.machineId),
        {
          includeJackpot,
          hasRelay: Boolean(detail?.relayId?.trim()),
          isWow: isWowMachine(detail),
          isNoSMIBLocation,
        }
      );

      if (result.variation !== null) totalVariation += result.variation;

      rows.push({
        machineId: machine.machineId,
        machineName,
        serialNumber: (detail?.serialNumber || '').trim() || undefined,
        machineCustomName: (detail?.custom?.name || '').trim() || undefined,
        meterGross: result.meterGross,
        sasGross: result.sasGross,
        variation: result.variation,
        sasStartTime: machine.sasStartTime ?? null,
        sasEndTime: machine.sasEndTime ?? null,
      });

      send({ type: 'progress', phase: 'checking', done: index + 1, total, machineName });
    }

    const hasVariations = rows.some(
      row => row.variation !== null && row.variation !== 0
    );

    send({
      type: 'done',
      data: { hasVariations, totalVariation, machines: rows },
    });
  });
}
